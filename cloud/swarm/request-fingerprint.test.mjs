import test from "node:test";
import assert from "node:assert/strict";
import { computeGitHubRequestFingerprint } from "./request-fingerprint.mjs";

const base = {
  provider: "github",
  repositoryId: "1454085952",
  operationId: "github.rest.repositories.get.v1",
  method: "GET",
  url: "https://api.github.com/repos/octocat/Hello-World",
  body: new Uint8Array(),
  credentialLane: "compute_readonly"
};

test("creates deterministic v1 fingerprint for reviewed GET request", async () => {
  const a = await computeGitHubRequestFingerprint(base);
  const b = await computeGitHubRequestFingerprint({...base});
  assert.equal(a.version, 1);
  assert.match(a.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(a.fingerprint, b.fingerprint);
  assert.equal(a.requestBodySha256, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("isolates repository, lane and URL path identities", async () => {
  const original = await computeGitHubRequestFingerprint(base);
  for (const changed of [
    {...base, repositoryId:"1454085953"},
    {...base, credentialLane:"publisher_restricted"},
    {...base, url:"https://api.github.com/repos/octocat/Other"}
  ]) {
    assert.notEqual((await computeGitHubRequestFingerprint(changed)).fingerprint, original.fingerprint);
  }
});

test("rejects non-GitHub origins, credentials, fragments, ports and query strings", async () => {
  for (const url of [
    "http://api.github.com/repos/octocat/Hello-World",
    "https://api.github.com.evil.invalid/repos/octocat/Hello-World",
    "https://user:pass@api.github.com/repos/octocat/Hello-World",
    "https://api.github.com:443/repos/octocat/Hello-World",
    "https://api.github.com/repos/octocat/Hello-World#fragment",
    "https://api.github.com/repos/octocat/Hello-World?per_page=1",
    "https://api.github.com/repos/octocat/%2e%2e/secrets",
    "https://api.github.com/repos/octocat%2fHello-World"
  ]) await assert.rejects(()=>computeGitHubRequestFingerprint({...base,url}));
});

test("rejects unreviewed operation, mutation method, body and caller digest", async () => {
  await assert.rejects(()=>computeGitHubRequestFingerprint({...base,operationId:"github.rest.unknown.v1"}));
  await assert.rejects(()=>computeGitHubRequestFingerprint({...base,method:"POST"}));
  await assert.rejects(()=>computeGitHubRequestFingerprint({...base,body:"non-empty"}));
  await assert.rejects(()=>computeGitHubRequestFingerprint({...base,fingerprint:"0".repeat(64)}));
});

test("rejects malformed repository IDs and credential lanes", async () => {
  await assert.rejects(()=>computeGitHubRequestFingerprint({...base,repositoryId:"0"}));
  await assert.rejects(()=>computeGitHubRequestFingerprint({...base,repositoryId:1454085952}));
  await assert.rejects(()=>computeGitHubRequestFingerprint({...base,credentialLane:"admin"}));
});
