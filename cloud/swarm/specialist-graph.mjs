/**
 * Phase 59.58 — deterministic specialist graph, shadow mode only.
 * Supplied evidence is untrusted; no fetch, attestation, publication, spend,
 * code execution, model inference, or financial-account access occurs here.
 */
const ROLE_IDS = [
  "EVIDENCE_COLLECTION","RESEARCH","RED_TEAM","PAYOUT_ELIGIBILITY","UNIT_ECONOMICS",
  "RIGHTS_POLICY","ENGINEERING","QA","DISTRIBUTION_READINESS","REVENUE_RECONCILIATION"
];
const encoder = new TextEncoder();
const MAX_INPUT_BYTES = 8192;
const MAX_PROPOSALS = 50;

function jsonBytes(value) {
  let serialized;
  try { serialized = JSON.stringify(value); } catch { throw new TypeError("SPECIALIST_INPUT_NOT_JSON"); }
  if (encoder.encode(serialized).byteLength > MAX_INPUT_BYTES) throw new TypeError("SPECIALIST_INPUT_TOO_LARGE");
}
function countArray(value) { return Array.isArray(value) ? Math.min(value.length, MAX_PROPOSALS) : 0; }
function role(roleId, blockers, details = {}) {
  return { role: roleId, status: "HOLD", blockers, details, proposalOnly: true, sideEffects: false };
}
export function specialistRoleIds() { return [...ROLE_IDS]; }

export function runDeterministicSpecialistGraph(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("SPECIALIST_PAYLOAD_OBJECT_REQUIRED");
  jsonBytes(payload);
  const evidenceProposals = Array.isArray(payload.evidence_proposals) ? payload.evidence_proposals.slice(0, MAX_PROPOSALS) : [];
  const claims = Array.isArray(payload.claims) ? payload.claims.slice(0, MAX_PROPOSALS) : [];
  const untrustedEvidenceIds = evidenceProposals
    .map(item => item && typeof item === "object" && typeof item.evidence_id === "string" ? item.evidence_id : null)
    .filter(Boolean);
  const unsupportedClaimIds = claims.map((claim, index) =>
    claim && typeof claim === "object" && typeof claim.claim_id === "string" ? claim.claim_id : "claim-" + index
  );
  const roles = [
    role("EVIDENCE_COLLECTION", ["TRUSTED_COLLECTOR_NOT_CONNECTED"], {
      proposedEvidenceCount: evidenceProposals.length, trustedEvidenceCount: 0,
      acceptedEvidenceIds: [], untrustedEvidenceIds
    }),
    role("RESEARCH", ["NO_TRUSTED_PRIMARY_SOURCE_EVIDENCE"], {
      verifiedPrimarySourceCount: 0, synthesisMode: "SUPPLIED_DATA_ONLY", externalFetchAllowed: false
    }),
    role("RED_TEAM", ["CLAIMS_REQUIRE_INDEPENDENT_PROVENANCE"], {
      claimsReviewed: claims.length, unsupportedClaimIds, promptInjectionTreatedAsData: true
    }),
    role("PAYOUT_ELIGIBILITY", [
      "INDIA_SELLER_ELIGIBILITY_UNVERIFIED","PAYOUT_RAIL_TERMS_UNVERIFIED","FEES_MINIMUMS_HOLDS_UNVERIFIED"
    ], { sellerCountry: "IN", authoritativeProviderEvidenceCount: 0 }),
    role("UNIT_ECONOMICS", ["VERIFIED_PRICE_FEES_REFUNDS_AND_DELIVERY_COSTS_MISSING"], {
      calculationPerformed: false, forecastProduced: false
    }),
    role("RIGHTS_POLICY", [
      "IP_OWNERSHIP_OR_LICENSE_UNVERIFIED","SOURCE_DATA_RIGHTS_UNVERIFIED","MODEL_AND_PLATFORM_TERMS_UNVERIFIED"
    ], { rightsAttestationsAccepted: 0 }),
    role("ENGINEERING", ["NO_APPROVED_IMPLEMENTATION_SPEC"], {
      codeGenerationAllowed: false, generatedCodeExecutionAllowed: false, implementationPlanOnly: true
    }),
    role("QA", ["REPRODUCIBLE_TEST_EVIDENCE_NOT_ATTACHED"], {
      verifiedTestSuites: 0, releaseQualityDecision: "NOT_READY"
    }),
    role("DISTRIBUTION_READINESS", [
      "OWNER_APPROVAL_NOT_PRESENT","PUBLISHER_APP_NOT_INSTALLED","BRANCH_RULESET_UNVERIFIED"
    ], { publicReleaseAllowed: false, publisherInvoked: false }),
    role("REVENUE_RECONCILIATION", ["NO_AUTHORITATIVE_OWNER_CREDIT_EVIDENCE"], {
      pcneCountedInr: 0, withdrawablePlatformBalanceInr: 0, bankSettledNetReceiptsInr: 0,
      pendingAmountsCounted: false
    })
  ];
  return {
    schemaVersion: "P59.58.SPECIALIST_GRAPH_V1", projectId: "P10CR", decision: "HOLD",
    roleOrder: ROLE_IDS, roles,
    summary: {
      rolesExecuted: roles.length, rolesPassed: 0, rolesHeld: roles.length,
      proposedEvidenceCount: evidenceProposals.length, trustedEvidenceCount: 0,
      claimsReviewed: countArray(payload.claims)
    },
    capabilities: {
      externalNetwork: false, modelInference: false, codeExecution: false,
      repositoryWrite: false, publication: false, accountActions: false,
      payments: false, ownerApproval: false
    },
    financial: { pcneCountedInr: 0, bankSettledNetReceiptsInr: 0, authorizedSpendInr: 0 }
  };
}
