# Phase 58.3 — MCP Contract Drift and Apify MCP Fit Screen
**Date:** 14 November 2026  
**Authority:** `MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md`  
**Task:** P58-001 | **V4 rank:** #4 Apify Store  
**Decision:** **NO-GO for generic MCP contract-drift monitoring; no Apify-specific product selected**  
**Spend / account / Actor run / publication:** ₹0 / none / none / none

## 1. Problem evidence
MCP tool contracts can change silently. The mcpindex Drift Report's frozen 19-Jul-2026 edition recorded 2,503 deduplicated safety-relevant incidents, 872 tool removals and 76 unstable contracts across 23 snapshots over 40 days. Its live counter, last derived 13-Nov-2026, showed 66,306 deduplicated incidents and 66.5% of safety-relevant contract changes arriving with the declared server version unchanged. This is one public corpus, not buyer demand or market-wide paid adoption:
- https://mcpindex.ai/drift-report

Flanj publishes a separate daily MCP contract watch. Its 12-Nov-2026 snapshot reported 63 servers and 4,647 comparison days; it highlighted a 5-Nov event with 178 findings across 25 tools and no version bump. These are observed contract changes, not WTP:
- https://drift.flanj.io/

OWASP's MCP security/testing material identifies configuration and schema changes as relevant risk because they can add servers, alter command paths, broaden arguments, change tool descriptions or change schemas:
- https://github.com/OWASP/MCP-Security-Testing-Guide
- https://github.com/OWASP/AISVS

## 2. Apify MCP integration surface
Apify documents a hosted MCP server at `mcp.apify.com` that lets external agents discover and run Apify Store Actors, access storage/results and retrieve Apify documentation. Actors are exposed as tools; the URL's `tools` parameter can select categories or named Actors:
- https://docs.apify.com/mcp

This gives a plausible integration surface for a customer-specific contract snapshot. However, the research has **not** established that an underlying Actor input-schema change always propagates into the MCP-visible tool contract for every configured Actor. That must not be assumed.

## 3. Direct and adjacent substitutes
| Substitute | Documented scope | Implication |
|---|---|---|
| **mcpindex gate** | Free, local, no-account in-path contract pin/diff; monitors tool names, parameters, constraints, annotations and schemas; can HOLD breaking changes | Direct free generic substitute |
| **mcpindex Drift Report** | Public MCP-registry crawl and contract-change history | Public drift intelligence already exists |
| **mcp-diff** | Deterministic snapshots of tools, input/output JSON Schemas, annotations, prompts, resources, capabilities and instructions; PR classification and GitHub Action | Direct self-hosted/CI substitute |
| **mcp-probe** | Tests tools, resources and prompts; schema validation, health scorecard and contract snapshot/diff/gating | Direct diagnostic substitute |
| **Flanj** | Daily contract watch based on contracts observed from live agent/service traffic | Direct runtime/traffic-based substitute |
| **Snyk Agent Scan / former mcp-scan** | MCP configuration discovery and scan for prompt injection/tool poisoning risks | Adjacent security coverage |
| **Cisco MCP Scanner** | MCP inspection using YARA, AI Defense and dependency/source checks | Adjacent security coverage |
| **Akto / Enkrypt AI / Lasso Security** | MCP server discovery, scanning, gateways or inline policy | Adjacent enterprise security coverage |

Primary project pages:
- https://mcpindex.ai/
- https://github.com/paulochastinet/mcp-diff
- https://github.com/Incultnitollc/mcp-probe
- https://drift.flanj.io/

mcpindex documents a specific Apify-related data-quality exclusion: the dynamic field `output.storages.datasets.default.itemsSchema` is inferred from prior crawls and not returned by the provider response. This is a warning against treating inferred metadata as a stable contract, not proof of an Apify Actor compromise:
- https://drift.flanj.io/

## 4. Apify-specific differentiation test
A separate product would need to deliver more than generic MCP tool pinning:
- bind a contract receipt to Apify Actor ID, Actor version and the customer's selected-Actor MCP URL/configuration;
- distinguish genuine Actor input-schema changes from inferred output metadata;
- prove that an underlying Actor schema change is reflected in the customer's actual MCP-visible contract;
- provide deterministic before/after evidence without executing Actors, paid tools or private credentials.

**Unproven:** per-Actor contract propagation; source/metadata availability and rights; a repeat approval workflow; two independent Apify-specific buyer signals; and price-bearing WTP.

## 5. Decision
| Gate | Finding |
|---|---|
| MCP contract-drift phenomenon | YES |
| Independent public measurement | YES |
| Generic open-source/free substitutes | SUBSTANTIAL |
| Generic runtime/CI substitutes | SUBSTANTIAL |
| Apify MCP server with Actor selection | DOCUMENTED |
| Actor input-schema propagation to MCP contract | NOT PROVEN |
| Two independent Apify-specific buyer signals | NOT ESTABLISHED |
| Qualified price-bearing WTP | NOT ESTABLISHED |
| Apify-specific source/metadata rights | NOT ESTABLISHED |
| Generic MCP drift monitor | **NO-GO** |
| Apify-specific adapter | **UNSELECTED RESEARCH LEAD ONLY** |

No Actor or monitoring product will be built. Do not create an Apify account, run an Actor, upload data, connect private GitHub or incur spend while the Apify platform incident/post-mortem gate remains unresolved.

## 6. Mission sequence
Apify remains V4 rank #4 and is **not rejected as a platform**. Phase 58.3 closes the generic MCP drift product hypothesis only. It does not authorize jumping to Getvik rank #5 while Apify's platform gate and remaining public research are still open. Continue P58-001 with distinct, rights-cleared buyer workflows only. If no Apify candidate passes the V4 gates after the post-mortem/status gate, record a platform-level NO-GO with evidence before moving to the next ranked lane.

PCNE ₹0; bank-settled receipts ₹0; authorized spend ₹0.
