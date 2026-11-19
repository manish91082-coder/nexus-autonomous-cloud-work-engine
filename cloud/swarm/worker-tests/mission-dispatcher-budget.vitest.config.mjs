import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const dispatcherIngressSecret = "dispatcher-ingress-test-secret-0123456789abcdef";
const swarmPrimarySecret = "swarm-primary-test-secret-0123456789abcdef";
const swarmSecondarySecret = "swarm-secondary-test-secret-0123456789abcdef";
const swarmDispatcherSecret = "swarm-dispatcher-test-secret-0123456789abcdef";
const platformPrimarySecret = "platform-primary-test-secret-0123456789abcdef";
const platformDispatcherSecret = "platform-dispatcher-test-secret-0123456789abcdef";

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
      wrangler: { configPath: "./mission-dispatcher-budget.wrangler.jsonc" },
      miniflare: {
        bindings: {
          NEXUS_SWARM_RUN_ENABLED: "true",
          NEXUS_SWARM_RUN_CALLER_ID: "primary",
          NEXUS_SWARM_RUN_CALLER_SECRET: swarmPrimarySecret,
          NEXUS_PLATFORM_BUDGET_ENABLED: "true",
          NEXUS_PLATFORM_BUDGET_CALLER_ID: "primary",
          NEXUS_PLATFORM_BUDGET_CALLER_SECRET: platformPrimarySecret
        },
        durableObjects: {
          SWARM_RUNS: sharedSwarmRunNamespace,
          PLATFORM_BUDGET: sharedPlatformBudgetNamespace
        },
        serviceBindings: {
          P10CR_MISSION_DISPATCHER: "p10cr-mission-dispatcher-budget-shadow"
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
                primary: swarmPrimarySecret,
                secondary: swarmSecondarySecret,
                dispatcher: swarmDispatcherSecret
              }),
              NEXUS_SWARM_RUN_CALLER_POLICIES: JSON.stringify({
                primary: ["register", "approve", "claim", "heartbeat", "checkpoint", "complete", "fail", "recover", "snapshot"],
                secondary: ["claim", "heartbeat", "checkpoint", "complete", "fail", "snapshot"],
                dispatcher: ["register", "claim", "heartbeat", "checkpoint", "complete", "fail", "snapshot"]
              })
            },
            durableObjects: { SWARM_RUNS: sharedSwarmRunNamespace }
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
              NEXUS_PLATFORM_BUDGET_TEST_CAPS: JSON.stringify({ dispatches: 1 }),
              NEXUS_PLATFORM_BUDGET_CALLER_KEYS: JSON.stringify({
                primary: platformPrimarySecret,
                dispatcher: platformDispatcherSecret
              }),
              NEXUS_PLATFORM_BUDGET_CALLER_POLICIES: JSON.stringify({
                primary: ["reserve", "heartbeat", "settle", "snapshot", "testReset", "testExpire"],
                dispatcher: ["reserve", "heartbeat", "settle", "snapshot"]
              })
            },
            durableObjects: { PLATFORM_BUDGET: sharedPlatformBudgetNamespace }
          },
          {
            name: "p10cr-mission-dispatcher-budget-shadow",
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
              NEXUS_DISPATCHER_INGRESS_SECRET: dispatcherIngressSecret,
              NEXUS_SWARM_RUN_CALLER_ID: "dispatcher",
              NEXUS_SWARM_RUN_CALLER_SECRET: swarmDispatcherSecret,
              NEXUS_PLATFORM_BUDGET_ENABLED: "true",
              NEXUS_PLATFORM_BUDGET_CALLER_ID: "dispatcher",
              NEXUS_PLATFORM_BUDGET_CALLER_SECRET: platformDispatcherSecret,
              NEXUS_SHADOW_WORKER_ID: "p10cr-mission-dispatcher-budget"
            },
            durableObjects: {
              SWARM_RUNS: sharedSwarmRunNamespace,
              PLATFORM_BUDGET: sharedPlatformBudgetNamespace
            }
          }
        ]
      }
    })
  ],
  test: {
    include: ["./mission-dispatcher-budget-integration.test.mjs"],
    testTimeout: 60000,
    hookTimeout: 60000
  }
});
