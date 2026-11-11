#!/usr/bin/env python3
"""Deterministic admission gate for autonomous-work platforms."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent
REGISTRY = ROOT / "platform_registry.json"
def evaluate(platform):
    status = platform.get("status", "")
    if status.startswith("READY"):
        return "ALLOW_READ_ONLY"
    if status == "CONDITIONAL_DEFER":
        if platform.get("live_open_jobs_observed", 0) <= 0:
            return "DEFER_NO_CURRENT_OPEN_WORK"
        if platform.get("india_payout") != "VERIFIED":
            return "DEFER_INDIA_PAYOUT_UNVERIFIED"
        if platform.get("human_gates"):
            return "HUMAN_GATE_REQUIRED"
        return "REVIEW_BEFORE_ENABLE"
    if status == "BLOCKED_PROTOCOL_V1_RETIRED_AND_FEED_DEGRADED":
        return "BLOCK_RETIRED_PROTOCOL"
    if status == "DEFER_SPECIALIZED_AND_WALLET_GATED":
        return "DEFER_SPECIALIZED_WALLET_GATED"
    if status == "EXCLUDE_CREDIT_ONLY":
        return "EXCLUDE_NON_CASH"
    if status == "EXCLUDE_CURRENT_TEST_MICRO_JOB":
        return "EXCLUDE_TEST_OR_MICRO_VALUE"
    if status == "EXCLUDE_UNAUDITED_TOKEN_AND_STALE_FEED":
        return "EXCLUDE_TOKEN_AND_STALE_FEED"
    return "BLOCK_UNKNOWN_STATUS"
def main():
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    results = [{"id": p["id"], "decision": evaluate(p)} for p in data["platforms"]]
    print(json.dumps({"status": "ok", "decisions": results}, indent=2))
if __name__ == "__main__":
    main()
