import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const primaryTestSecret = "primary-test-secret-0123456789abcdef";
const secondaryTestSecret = "secondary-test-secret-0123456789abcdef";
const shadowWorkerTestSecret = "shadow-worker-test-secret-0123456789abcdef";
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
          SECOND_CALLER: "p10cr-secondary-caller",
          SHADOW_WORKER: "p10cr-read-only-shadow-worker"
        },
        workers: [
          {
            name: "p10cr-quota-ledger-host",
            rootPath: "../",
            modules: [
              { type: "ESModule", path: "./quota-ledger-host.mjs" },
              { type: "ESModule", path: "./quota-ledger-do.mjs" },
              { type: "ESModule", path: "./quota-ledger-contract.mjs" },
              { type: "ESModule", path: "./github-quota-telemetry.mjs" },
              { type: "ESModule", path: "./github-operation-registry.mjs" },
              { type: "ESModule", path: "./github-secondary-rate-limit.mjs" }
            ],
            bindings: {
              NEXUS_QUOTA_STORE_ENABLED: "true",
              NEXUS_QUOTA_RESERVATION_TTL_SECONDS: "30",
              NEXUS_QUOTA_MAX_RESERVATION_LIFETIME_SECONDS: "300",
              NEXUS_GITHUB_SECONDARY_MAX_IN_FLIGHT: "2",
              NEXUS_GITHUB_REST_ENDPOINT_POINTS_PER_MINUTE: "2",
              NEXUS_QUOTA_CALLER_KEYS: JSON.stringify({
                primary: primaryTestSecret,
                secondary: secondaryTestSecret,
                shadow: shadowWorkerTestSecret
              }),
              NEXUS_QUOTA_CALLER_POLICIES: JSON.stringify({
                primary: ["reserve", "settle", "markUncertain", "expireReservations", "renewReservation", "reconcileUncertain", "snapshot", "recordTelemetry", "recordSecondaryLimit"],
                secondary: ["reserve", "settle", "markUncertain", "renewReservation", "recordTelemetry", "recordSecondaryLimit"],
                shadow: ["reserve", "settle", "markUncertain", "renewReservation", "recordTelemetry", "recordSecondaryLimit"]
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
                multi: {core: 10, search: 5},
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
          },

          {
            name: "p10cr-read-only-shadow-worker",
            rootPath: "../",
            modules: [
              { type: "ESModule", path: "./read-only-swarm-worker.mjs" },
              { type: "ESModule", path: "./quota-ledger-client.mjs" },
              { type: "ESModule", path: "./quota-ledger-contract.mjs" },
              { type: "ESModule", path: "./github-quota-telemetry.mjs" },
              { type: "ESModule", path: "./github-operation-registry.mjs" },
              { type: "ESModule", path: "./github-secondary-rate-limit.mjs" }
            ],
            bindings: {
              NEXUS_QUOTA_STORE_ENABLED: "true",
              NEXUS_QUOTA_CALLER_ID: "shadow",
              NEXUS_QUOTA_CALLER_SECRET: shadowWorkerTestSecret,
              NEXUS_QUOTA_CREDENTIAL_SCOPE: "github-app-installation:shadow-test-42",
              NEXUS_SWARM_MODE: "SHADOW",
              NEXUS_SWARM_SHADOW_RESET_AT: "4102444800"
            },
            durableObjects: {
              QUOTA_LEDGER: sharedQuotaNamespace
            }
          },
        ]
      }
    })
  ],
  test: {
    include: ["./quota-ledger-runtime.test.mjs"],
    testTimeout: 60000,
    hookTimeout: 60000
  }
});
