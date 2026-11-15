import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        serviceBindings: {
          SECOND_CALLER: "p10cr-secondary-caller"
        },
        workers: [
          {
            name: "p10cr-secondary-caller",
            modules: [
              { type: "ESModule", path: "./second-caller.mjs" }
            ],
            durableObjects: {
              QUOTA_LEDGER: {
                className: "QuotaLedgerDO",
                scriptName: "nexus-quota-ledger-runtime-tests",
                useSQLite: true
              }
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
