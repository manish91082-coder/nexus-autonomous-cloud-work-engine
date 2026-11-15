import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const primaryTestSecret = "primary-test-secret-0123456789abcdef";
const secondaryTestSecret = "secondary-test-secret-0123456789abcdef";
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
        bindings: {
          NEXUS_QUOTA_CALLER_ID: "primary",
          NEXUS_QUOTA_CALLER_SECRET: primaryTestSecret
        },
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
            bindings: {
              NEXUS_QUOTA_CALLER_KEYS: JSON.stringify({
                primary: primaryTestSecret,
                secondary: secondaryTestSecret
              })
            },
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
              { type: "ESModule", path: "./second-caller.mjs" },
              { type: "ESModule", path: "./quota-auth-test-helper.mjs" }
            ],
            bindings: {
              NEXUS_QUOTA_CALLER_ID: "secondary",
              NEXUS_QUOTA_CALLER_SECRET: secondaryTestSecret
            },
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
