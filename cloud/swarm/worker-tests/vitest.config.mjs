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
          NEXUS_QUOTA_STORE_ENABLED: "true",
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
              { type: "ESModule", path: "./quota-ledger-contract.mjs" },
              { type: "ESModule", path: "./github-quota-telemetry.mjs" }
            ],
            bindings: {
              NEXUS_QUOTA_STORE_ENABLED: "true",
              NEXUS_QUOTA_RESERVATION_TTL_SECONDS: "300",
              NEXUS_QUOTA_CALLER_KEYS: JSON.stringify({
                primary: primaryTestSecret,
                secondary: secondaryTestSecret
              }),
              NEXUS_QUOTA_CALLER_POLICIES: JSON.stringify({
                primary: ["reserve", "settle", "markUncertain", "expireReservations", "snapshot", "recordTelemetry"],
                secondary: ["reserve", "settle", "markUncertain", "recordTelemetry"]
              }),
              NEXUS_QUOTA_BUCKET_POLICIES: JSON.stringify({
                core: {safetyReserveUnits: 5, recoveryReserveUnits: 5, maxTelemetryAgeSeconds: 300},
                search: {safetyReserveUnits: 5, recoveryReserveUnits: 5, maxTelemetryAgeSeconds: 300},
                code_search: {safetyReserveUnits: 5, recoveryReserveUnits: 5, maxTelemetryAgeSeconds: 300},
                graphql: {safetyReserveUnits: 5, recoveryReserveUnits: 5, maxTelemetryAgeSeconds: 300}
              }),
              NEXUS_QUOTA_OPERATION_COSTS: JSON.stringify({
                "github.rest.repositories.get.v1": {core: 1},
                core10: {core: 10},
                core20_search5: {core: 20, search: 5},
                core10_search3: {core: 10, search: 3},
                core10_search2: {core: 10, search: 2},
                core7: {core: 7},
                core9: {core: 9},
                core5: {core: 5},
                core1: {core: 1}
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
