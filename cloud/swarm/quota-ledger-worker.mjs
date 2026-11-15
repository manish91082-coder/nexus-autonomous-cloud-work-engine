import { DurableObject } from "cloudflare:workers";
import { QuotaLedgerDO as QuotaLedgerLogic } from "./quota-ledger-do.mjs";

/** Cloudflare RPC-facing class; pure quota policy remains Node-testable separately. */
export class QuotaLedgerDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.logic = new QuotaLedgerLogic(ctx, env);
  }

  reserve(input) {
    return this.logic.reserve(input);
  }

  settle(input) {
    return this.logic.settle(input);
  }

  markUncertain(input) {
    return this.logic.markUncertain(input);
  }

  snapshot() {
    return this.logic.snapshot();
  }
}

export default {
  async fetch() {
    return new Response("Not Found", { status: 404 });
  }
};
