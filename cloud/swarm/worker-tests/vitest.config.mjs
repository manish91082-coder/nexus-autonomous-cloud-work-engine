import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const primaryTestSecret = "primary-test-secret-0123456789abcdef";
const secondaryTestSecret = "secondary-test-secret-0123456789abcdef";
const shadowWorkerTestSecret = "shadow-worker-test-secret-0123456789abcdef";
const shadowWorkerSecondaryTestSecret = "shadow-secondary-test-secret-0123456789abcdef";
const swarmPrimaryTestSecret = "swarm-primary-test-secret-0123456789abcdef";
const swarmSecondaryTestSecret = "swarm-secondary-test-secret-0123456789abcdef";
const swarmDispatcherSecret = "swarm-dispatcher-test-secret-0123456789abcdef";
const dispatcherIngressSecret = "dispatcher-ingress-test-secret-0123456789abcdef";
const platformDispatcherSecret = "platform-dispatcher-test-secret-0123456789abcdef";
const phase59_56ProjectASecret = "p59-56-project-a-test-secret-0123456789abcdef";
const phase59_56ProjectBSecret = "p59-56-project-b-test-secret-0123456789abcdef";
const sharedQuotaNamespace = {
  className: "QuotaLedgerDO",
  scriptName: "p10cr-quota-ledger-host",
  useSQLite: true
};
const sharedSwarmRunNamespace = {
  className: "SwarmRunDO",
  scriptName: "p10cr-swarm-run-host",
  useSQLite: true
};
const sharedPlatformBudgetNamespace = {
  className: "PlatformBudgetDO",
  scriptName: "p10cr-platform-budget-host",
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
          NEXUS_QUOTA_CALLER_SECRET: primaryTestSecret,
          NEXUS_SWARM_RUN_ENABLED: "true",
          NEXUS_SWARM_RUN_CALLER_ID: "primary",
          NEXUS_SWARM_RUN_CALLER_SECRET: swarmPrimaryTestSecret,
          NEXUS_PLATFORM_BUDGET_ENABLED: "true",
          NEXUS_PLATFORM_BUDGET_CALLER_ID: "dispatcher",
          NEXUS_PLATFORM_BUDGET_CALLER_SECRET: platformDispatcherSecret
        },
        durableObjects: {
          QUOTA_LEDGER: sharedQuotaNamespace,
          SWARM_RUNS: sharedSwarmRunNamespace,
          PLATFORM_BUDGET: sharedPlatformBudgetNamespace
        },
        serviceBindings: {
          SECOND_CALLER: "p10cr-secondary-caller",
          SHADOW_WORKER: "p10cr-read-only-shadow-worker",
          SECOND_SHADOW_WORKER: "p10cr-read-only-shadow-worker-secondary",
          PHASE_59_44_SHADOW_WORKER: "p10cr-read-only-shadow-worker-phase-59-44",
          PHASE_59_46_PRIMARY: "p10cr-read-only-shadow-worker-phase-59-46-primary",
          PHASE_59_46_SECONDARY: "p10cr-read-only-shadow-worker-phase-59-46-secondary",
          PHASE_59_56_PROJECT_A: "p10cr-phase59-56-project-a",
          PHASE_59_56_PROJECT_B: "p10cr-phase59-56-project-b",
          P10CR_MISSION_DISPATCHER: "p10cr-mission-dispatcher-shadow"
        },
        workers: [
          {
            name: "p10cr-swarm-run-host",
            rootPath: "../",
            modules: [
              { type: "ESModule", path: "./swarm-run-host.mjs" },
              { type: "ESModule", path: "./swarm-run-do.mjs" }
            ],
            bindings: {
              NEXUS_SWARM_RUN_ENABLED: "true",
              NEXUS_SWARM_RUN_CALLER_KEYS: JSON.stringify({
                primary: swarmPrimaryTestSecret,
                secondary: swarmSecondaryTestSecret,
                dispatcher: swarmDispatcherSecret
              }),
              NEXUS_SWARM_RUN_CALLER_POLICIES: JSON.stringify({
                primary: ["register", "approve", "claim", "heartbeat", "checkpoint", "complete", "fail", "recover", "snapshot"],
                secondary: ["claim", "heartbeat", "checkpoint", "complete", "fail", "snapshot"],
                dispatcher: ["register", "claim", "heartbeat", "checkpoint", "complete", "fail", "snapshot"]
              })
            },
            durableObjects: {
              SWARM_RUNS: sharedSwarmRunNamespace
            }
          },
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
                shadow: shadowWorkerTestSecret,
                "shadow-secondary": shadowWorkerSecondaryTestSecret,
                "phase59-56-project-a": phase59_56ProjectASecret,
                "phase59-56-project-b": phase59_56ProjectBSecret
              }),
              NEXUS_QUOTA_CALLER_POLICIES: JSON.stringify({
                primary: ["reserve", "settle", "markUncertain", "expireReservations", "renewReservation", "reconcileUncertain", "snapshot", "recordTelemetry", "recordSecondaryLimit"],
                secondary: ["reserve", "settle", "markUncertain", "renewReservation", "recordTelemetry", "recordSecondaryLimit"],
                shadow: ["reserve", "settle", "markUncertain", "renewReservation", "recordTelemetry", "recordSecondaryLimit"],
                "shadow-secondary": ["reserve", "settle", "markUncertain", "renewReservation", "recordTelemetry", "recordSecondaryLimit"],
                "phase59-56-project-a": ["reserve", "settle", "markUncertain", "renewReservation", "recordTelemetry", "recordSecondaryLimit"],
                "phase59-56-project-b": ["reserve", "settle", "markUncertain", "renewReservation", "recordTelemetry", "recordSecondaryLimit"]
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
              NEXUS_QUOTA_CREDENTIAL_SCOPE: "github-app-installation:shadow-test-45a",
              NEXUS_SWARM_WORKER_ID: "p10cr-read-only-shadow-worker-primary",
              NEXUS_SWARM_MODE: "SHADOW",
              NEXUS_SWARM_SHADOW_RESET_AT: "4102444800",
              NEXUS_GITHUB_REST_ENDPOINT_POINTS_PER_MINUTE: "2"
            },
            durableObjects: {
              QUOTA_LEDGER: sharedQuotaNamespace
            }
          },
          {
            name: "p10cr-read-only-shadow-worker-phase-59-44",
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
              NEXUS_QUOTA_CREDENTIAL_SCOPE: "github-app-installation:shadow-test-44",
              NEXUS_SWARM_WORKER_ID: "p10cr-read-only-shadow-worker-phase-59-44",
              NEXUS_SWARM_MODE: "SHADOW",
              NEXUS_SWARM_SHADOW_RESET_AT: "4102444800",
              NEXUS_GITHUB_REST_ENDPOINT_POINTS_PER_MINUTE: "2"
            },
            durableObjects: {
              QUOTA_LEDGER: sharedQuotaNamespace
            }
          },
          {
            name: "p10cr-read-only-shadow-worker-secondary",
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
              NEXUS_QUOTA_CALLER_ID: "shadow-secondary",
              NEXUS_QUOTA_CALLER_SECRET: shadowWorkerSecondaryTestSecret,
              NEXUS_QUOTA_CREDENTIAL_SCOPE: "github-app-installation:shadow-test-45a",
              NEXUS_SWARM_WORKER_ID: "p10cr-read-only-shadow-worker-secondary",
              NEXUS_SWARM_MODE: "SHADOW",
              NEXUS_SWARM_SHADOW_RESET_AT: "4102444800",
              NEXUS_GITHUB_REST_ENDPOINT_POINTS_PER_MINUTE: "2"
            },
            durableObjects: {
              QUOTA_LEDGER: sharedQuotaNamespace
            }
          },
          {
            name: "p10cr-read-only-shadow-worker-phase-59-46-primary",
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
              NEXUS_QUOTA_CREDENTIAL_SCOPE: "github-app-installation:shadow-test-46",
              NEXUS_SWARM_WORKER_ID: "p10cr-read-only-shadow-worker-phase-59-46-primary",
              NEXUS_SWARM_MODE: "SHADOW",
              NEXUS_SWARM_SHADOW_RESET_AT: "4102444800",
              NEXUS_GITHUB_REST_ENDPOINT_POINTS_PER_MINUTE: "2"
            },
            durableObjects: { QUOTA_LEDGER: sharedQuotaNamespace }
          },
          {
            name: "p10cr-read-only-shadow-worker-phase-59-46-secondary",
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
              NEXUS_QUOTA_CALLER_ID: "shadow-secondary",
              NEXUS_QUOTA_CALLER_SECRET: shadowWorkerSecondaryTestSecret,
              NEXUS_QUOTA_CREDENTIAL_SCOPE: "github-app-installation:shadow-test-46",
              NEXUS_SWARM_WORKER_ID: "p10cr-read-only-shadow-worker-phase-59-46-secondary",
              NEXUS_SWARM_MODE: "SHADOW",
              NEXUS_SWARM_SHADOW_RESET_AT: "4102444800",
              NEXUS_GITHUB_REST_ENDPOINT_POINTS_PER_MINUTE: "2"
            },
            durableObjects: { QUOTA_LEDGER: sharedQuotaNamespace }
          },

          {
            name: "p10cr-phase59-56-project-a",
            rootPath: "../",
            modules: [
              { type: "ESModule", path: "./cross-repository-quota-worker.mjs" },
              { type: "ESModule", path: "./quota-ledger-client.mjs" },
              { type: "ESModule", path: "./quota-ledger-contract.mjs" },
              { type: "ESModule", path: "./github-quota-telemetry.mjs" },
              { type: "ESModule", path: "./github-operation-registry.mjs" },
              { type: "ESModule", path: "./github-secondary-rate-limit.mjs" }
            ],
            bindings: {
              NEXUS_QUOTA_STORE_ENABLED: "true",
              NEXUS_QUOTA_CALLER_ID: "phase59-56-project-a",
              NEXUS_QUOTA_CALLER_SECRET: phase59_56ProjectASecret,
              NEXUS_QUOTA_CREDENTIAL_SCOPE: "github-app-installation:synthetic-phase59-56-installation",
              NEXUS_SWARM_WORKER_ID: "p59-56-worker-project-a",
              NEXUS_SWARM_MODE: "SHADOW",
              NEXUS_SHADOW_PROJECT_ID: "P10CR",
              NEXUS_SHADOW_REPOSITORY: "synthetic-org/p10cr-shadow-repo",
              NEXUS_GITHUB_REST_ENDPOINT_POINTS_PER_MINUTE: "2",
              NEXUS_GITHUB_SECONDARY_MAX_IN_FLIGHT: "2"
            },
            durableObjects: { QUOTA_LEDGER: sharedQuotaNamespace }
          },
          {
            name: "p10cr-phase59-56-project-b",
            rootPath: "../",
            modules: [
              { type: "ESModule", path: "./cross-repository-quota-worker.mjs" },
              { type: "ESModule", path: "./quota-ledger-client.mjs" },
              { type: "ESModule", path: "./quota-ledger-contract.mjs" },
              { type: "ESModule", path: "./github-quota-telemetry.mjs" },
              { type: "ESModule", path: "./github-operation-registry.mjs" },
              { type: "ESModule", path: "./github-secondary-rate-limit.mjs" }
            ],
            bindings: {
              NEXUS_QUOTA_STORE_ENABLED: "true",
              NEXUS_QUOTA_CALLER_ID: "phase59-56-project-b",
              NEXUS_QUOTA_CALLER_SECRET: phase59_56ProjectBSecret,
              NEXUS_QUOTA_CREDENTIAL_SCOPE: "github-app-installation:synthetic-phase59-56-installation",
              NEXUS_SWARM_WORKER_ID: "p59-56-worker-project-b",
              NEXUS_SWARM_MODE: "SHADOW",
              NEXUS_SHADOW_PROJECT_ID: "SYNTHETIC-READONLY",
              NEXUS_SHADOW_REPOSITORY: "synthetic-org/isolated-project-shadow-repo",
              NEXUS_GITHUB_REST_ENDPOINT_POINTS_PER_MINUTE: "2",
              NEXUS_GITHUB_SECONDARY_MAX_IN_FLIGHT: "2"
            },
            durableObjects: { QUOTA_LEDGER: sharedQuotaNamespace }
          },
          {
            name: "p10cr-platform-budget-host",
            rootPath: "../",
            modules: [
              { type: "ESModule", path: "./platform-budget-host.mjs" },
              { type: "ESModule", path: "./platform-budget-do.mjs" }
            ],
            bindings: {
              NEXUS_PLATFORM_BUDGET_ENABLED: "true",
              NEXUS_PLATFORM_BUDGET_TEST_MODE: "true",
              NEXUS_PLATFORM_BUDGET_CALLER_KEYS: JSON.stringify({ dispatcher: platformDispatcherSecret }),
              NEXUS_PLATFORM_BUDGET_CALLER_POLICIES: JSON.stringify({ dispatcher: ["reserve", "heartbeat", "settle", "snapshot"] })
            },
            durableObjects: { PLATFORM_BUDGET: sharedPlatformBudgetNamespace }
          },
          {
            name: "p10cr-mission-dispatcher-shadow",
            rootPath: "../",
            modules: [
              { type: "ESModule", path: "./mission-dispatcher-shadow-worker.mjs" },
              { type: "ESModule", path: "./mission-dispatcher-shadow.mjs" },
              { type: "ESModule", path: "./specialist-graph.mjs" },
              { type: "ESModule", path: "./swarm-run-rpc-client.mjs" },
              { type: "ESModule", path: "./platform-budget-rpc-client.mjs" }
            ],
            bindings: {
              NEXUS_MISSION_SHADOW_ENABLED: "true",
              NEXUS_SHADOW_TEST_MODE: "true",
              NEXUS_DISPATCHER_INGRESS_SECRET: dispatcherIngressSecret,
              NEXUS_SWARM_RUN_CALLER_ID: "dispatcher",
              NEXUS_SWARM_RUN_CALLER_SECRET: swarmDispatcherSecret,
              NEXUS_PLATFORM_BUDGET_ENABLED: "true",
              NEXUS_PLATFORM_BUDGET_CALLER_ID: "dispatcher",
              NEXUS_PLATFORM_BUDGET_CALLER_SECRET: platformDispatcherSecret,
              NEXUS_SHADOW_WORKER_ID: "p10cr-mission-dispatcher"
            },
            durableObjects: { SWARM_RUNS: sharedSwarmRunNamespace, PLATFORM_BUDGET: sharedPlatformBudgetNamespace }
          },
        ]
      }
    })
  ],
  test: {
    include: ["./quota-ledger-runtime.test.mjs", "./swarm-run-ledger-runtime.test.mjs", "./phase59-56-cross-repository-global-quota.test.mjs", "./mission-dispatcher-runtime.test.mjs"],
    testTimeout: 60000,
    hookTimeout: 60000
  }
});
