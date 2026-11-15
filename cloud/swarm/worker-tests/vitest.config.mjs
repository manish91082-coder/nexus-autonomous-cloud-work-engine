import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const sharedQuotaNamespace = {
  className: "QuotaLedgerDO",
  scriptName: "p10cr-quota-ledger-host",
  useSQLite: true
};

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        durableObjects: {
          QUOTA_LEDGER: sharedQuotaNamespace
        },
        serviceBindings: {
          SECOND_CALLER: "p10cr-secondary-caller"
        },
        workers: [
          {
            name: "p10cr-quota-ledger-host",
            rootPath: "../",
            modules: [
              { type: "ESModule", path: "./quota-ledger-host.mjs" },
              { type: "ESModule", path: "./quota-ledger-do.mjs" },
              { type: "ESModule", path: "./quota-ledger-contract.mjs" }
            ],
            durableObjects: {
              QUOTA_LEDGER: {
                className: "QuotaLedgerDO",
                scriptName: "p10cr-quota-ledger-host",
                useSQLite: true
              }
            }
          },
          {
            name: "p10cr-secondary-caller",
            modules: [
              { type: "ESModule", path: "./second-caller.mjs" }
            ],
            durableObjects: {
              QUOTA_LEDGER: sharedQuotaNamespace
            }
          }
        ]
      }
    })
  ],
  test: {
    include: ["./quota-ledger-runtime.test.mjs"],
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
