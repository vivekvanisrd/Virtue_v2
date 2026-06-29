const { getDashboardStatsAction } = require("../src/lib/actions/dashboard-actions");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Mock sovereign identity so the action bypasses verification during test override
process.env.TEST_OVERRIDE_SOVEREIGN = "true";
process.env.TEST_SCHOOL_ID = "VIVES";
process.env.TEST_BRANCH_ID = "VIVES-RCB";
process.env.TEST_ROLE = "OWNER";

async function main() {
  console.log("--- DASHBOARD STATS LATENCY BENCHMARK ---");
  console.log(`Connecting via: ${process.env.DATABASE_URL}`);
  
  // Warm up connection
  await getDashboardStatsAction();

  const start = Date.now();
  const res = await getDashboardStatsAction();
  const duration = Date.now() - start;

  if (res.success) {
    console.log(`✅ Stats fetch succeeded in: ${duration}ms`);
    console.log(`Outstanding Dues: ₹${res.data.outstandingDues.toLocaleString()}`);
    console.log(`Expected Revenue: ₹${res.data.expectedRevenue.toLocaleString()}`);
    console.log(`Lifetime Collected: ₹${res.data.collectedRevenue.toLocaleString()}`);
  } else {
    console.error("❌ Action failed:", res.error);
  }
}

main();
