/**
 * Phase 59.45C — strict Service Assertion verifier.
 * Dedicated maintenance/observer identity; never reuses CLA or EDR keys.
 * Replay consumption remains an atomic QLDO responsibility.
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const MAX_LENGTH = 4096;
const MAX_TTL_SECONDS = 120;
const PRINCIPALS = new Set(["quota-maintenance-primary", "quota-observer"]);
const ACTIONS = new Set(["expireReservations", "reconcileUncertain", "snapshot"]);
const INSTALLATION_SCOPE = /^github-app-installation:[1-9][0-9]{0,19}$/;
const ID = /^[A-Za-z0-9._:-]{8,128}$/;
function fail(reason) { throw new TypeError(`service assertion rejected: ${reason}`); }
function exactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value,k))) fail("schema mismatch");
}
function decode(segment, max) {
  if (typeof segment !== "string" || !/^[A-Za-z0-9_-]+$/.test(segment) || segment.length % 4 === 1) fail("invalid base64url");
  const padded=segment.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-segment.length%4)%4);
  let binary; try { binary=atob(padded); } catch { fail("invalid base64url"); }
  if (binary.length>max) fail("segment too large");
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  let canonical=""; for(const b of bytes) canonical+=String.fromCharCode(b);
  if(btoa(canonical).replace(/=/g,"").replace(/\\+/g,"-").replace(/\\//g,"_")!==segment) fail("non-canonical base64url");
  return bytes;
}
function parse(bytes,label) {
  try { const x=JSON.parse(decoder.decode(bytes)); if(!x||typeof x!=="object"||Array.isArray(x)) fail(`${label} must be object`); return x; }
  catch(e) { if(e instanceof TypeError&&e.message.startsWith("service assertion")) throw e; fail(`invalid ${label}`); }
}
function validate(c,now,expected) {
  exactKeys(c,["iss","aud","principal","actions","partition_scope","issued_at","expires_at","jti","key_version"]);
  if(c.iss!==expected.issuer||c.aud!==expected.audience) fail("issuer or audience mismatch");
  if(!PRINCIPALS.has(c.principal)) fail("unknown principal");
  if(!Array.isArray(c.actions)||c.actions.length===0||new Set(c.actions).size!==c.actions.length
    ||c.actions.some(a=>!ACTIONS.has(a))) fail("invalid action allowlist");
  const allowed=c.principal==="quota-maintenance-primary"?new Set(["expireReservations","reconcileUncertain"]):new Set(["snapshot"]);
  if(c.actions.some(a=>!allowed.has(a))) fail("principal/action policy violation");
  if(!Array.isArray(c.partition_scope)||c.partition_scope.length===0||new Set(c.partition_scope).size!==c.partition_scope.length
    ||c.partition_scope.some(s=>typeof s!=="string"||!INSTALLATION_SCOPE.test(s))) fail("explicit installation partition scope required");
  if(!Number.isSafeInteger(c.issued_at)||!Number.isSafeInteger(c.expires_at)
    ||c.issued_at>now+5||c.expires_at<=now||c.expires_at<=c.issued_at
    ||c.expires_at-c.issued_at>MAX_TTL_SECONDS||c.issued_at<now-MAX_TTL_SECONDS) fail("time window invalid");
  if(typeof c.jti!=="string"||!ID.test(c.jti)) fail("invalid jti");
  if(typeof c.key_version!=="string"||! /^[A-Za-z0-9._-]{1,64}$/.test(c.key_version)) fail("invalid key_version");
  if(expected.action!==undefined&&!c.actions.includes(expected.action)) fail("action not authorized");
  if(expected.partition!==undefined&&!c.partition_scope.includes(expected.partition)) fail("partition not authorized");
  if(expected.principal!==undefined&&c.principal!==expected.principal) fail("principal mismatch");
  return c;
}
/**
 * Verify SA signature, issuer/audience, principal, action and partition scope.
 * publicKeys is a server-pinned map kid -> CryptoKey or public JWK.
 * The caller MUST atomically consume jti in QLDO before a mutating action.
 */
export async function verifyServiceAssertion({assertion,publicKeys,issuer,audience,nowEpoch=Math.floor(Date.now()/1000),...expected}) {
  if(typeof assertion!=="string"||assertion.length>MAX_LENGTH) fail("assertion missing or too large");
  if(!Number.isSafeInteger(nowEpoch)||nowEpoch<0) fail("invalid clock");
  const parts=assertion.split("."); if(parts.length!==3||parts.some(x=>!x)) fail("compact JWS required");
  const [h,p,s]=parts,header=parse(decode(h,512),"header");
  exactKeys(header,["alg","kid","typ"]);
  if(header.alg!=="ES256"||header.typ!=="JWT"||typeof header.kid!=="string"||!/^[A-Za-z0-9._-]{1,64}$/.test(header.kid)) fail("unsupported protected header");
  const source=publicKeys?.[header.kid]; if(!source) fail("unknown service signing key");
  const claims=parse(decode(p,3072),"claims"); validate(claims,nowEpoch,{issuer,audience,...expected});
  const sig=decode(s,64); if(sig.length!==64) fail("invalid ES256 signature length");
  try {
    const key=typeof CryptoKey!=="undefined"&&source instanceof CryptoKey?source:
      await crypto.subtle.importKey("jwk",source,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    if(!await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,sig,encoder.encode(`${h}.${p}`))) fail("signature invalid");
  } catch(e) { if(e instanceof TypeError&&e.message.startsWith("service assertion")) throw e; fail("signature verification failed"); }
  return Object.freeze({issuer:claims.iss,audience:claims.aud,principal:claims.principal,
    actions:Object.freeze([...claims.actions]),partitionScope:Object.freeze([...claims.partition_scope]),
    issuedAt:claims.issued_at,expiresAt:claims.expires_at,jti:claims.jti,keyVersion:claims.key_version});
}
