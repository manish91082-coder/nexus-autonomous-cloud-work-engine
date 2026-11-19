import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const callerASecret = "p10cr-platform-budget-caller-a-test-secret-0123456789";
const callerBSecret = "p10cr-platform-budget-caller-b-test-secret-0123456789";
const sharedBudget = {
  className: "PlatformBudgetDO",
  scriptName: "p10cr-platform-budget-host",
  useSQLite: true
};
const testCaps = {
  worker_requests: 8,
  do_requests: 64,
  do_duration_milli_gb_seconds: 4000,
  sqlite_rows_read: 360,
  sqlite_rows_written: 144,
  storage_bytes: 131072,
  dispatches: 8,
  budget_rpc_requests: 200,
  budget_duration_milli_gb_seconds: 2000,
  budget_sqlite_rows_read: 1000,
  budget_sqlite_rows_written: 600,
  budget_storage_bytes: 1048576
};

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./platform-budget.wrangler.jsonc" },
      miniflare: {
        serviceBindings: {
          PLATFORM_BUDGET_CALLER_A: "p10cr-platform-budget-caller-a",
          PLATFORM_BUDGET_CALLER_B: "p10cr-platform-budget-caller-b"
        },
        workers: [
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
              NEXUS_PLATFORM_BUDGET_TEST_CAPS: JSON.stringify(testCaps),
              NEXUS_PLATFORM_BUDGET_TEST_LEASE_SECONDS: "60",
              NEXUS_PLATFORM_BUDGET_CALLER_KEYS: JSON.stringify({
                caller_a: callerASecret,
                caller_b: callerBSecret
              }),
              NEXUS_PLATFORM_BUDGET_CALLER_POLICIES: JSON.stringify({
                caller_a: ["reserve", "heartbeat", "settle", "snapshot", "testReset", "testExpire"],
                caller_b: ["reserve", "heartbeat", "settle", "snapshot", "testReset", "testExpire"]
              })
            },
            durableObjects: { PLATFORM_BUDGET: sharedBudget }
          },
          {
            name: "p10cr-platform-budget-caller-a",
            rootPath: "../",
            modules: [
              { type: "ESModule", path: "./worker-tests/platform-budget-test-worker.mjs" },
              { type: "ESModule", path: "./platform-budget-rpc-client.mjs" }
            ],
            bindings: {
              NEXUS_PLATFORM_BUDGET_ENABLED: "true",
              NEXUS_PLATFORM_BUDGET_CALLER_ID: "caller_a",
              NEXUS_PLATFORM_BUDGET_CALLER_SECRET: callerASecret
            },
            durableObjects: { PLATFORM_BUDGET: sharedBudget }
          },
          {
            name: "p10cr-platform-budget-caller-b",
            rootPath: "../",
            modules: [
              { type: "ESModule", path: "./worker-tests/platform-budget-test-worker.mjs" },
              { type: "ESModule", path: "./platform-budget-rpc-client.mjs" }
            ],
            bindings: {
              NEXUS_PLATFORM_BUDGET_ENABLED: "true",
              NEXUS_PLATFORM_BUDGET_CALLER_ID: "caller_b",
              NEXUS_PLATFORM_BUDGET_CALLER_SECRET: callerBSecret
            },
            durableObjects: { PLATFORM_BUDGET: sharedBudget }
          }
        ]
      }
    })
  ]
});
