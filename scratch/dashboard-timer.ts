import { getDashboardStatsAction } from "../src/lib/actions/dashboard-actions";

async function runDashboardTest() {
  console.log("⏱️  [PROFILER] Testing getDashboardStatsAction speed...");
  
  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_STAFF_ID = "341b73a6-6e1c-4be3-9d02-a3efdd9440fc";
  process.env.TEST_ROLE = "OWNER";
  process.env.TEST_SCHOOL_ID = "VIVES";
  process.env.TEST_BRANCH_ID = "VIVES-RCB";
  process.env.NODE_ENV = "development";

  const tStart = Date.now();
  const res = await getDashboardStatsAction();
  const tTotal = Date.now() - tStart;
  
  console.log(`\n⏱️  [PROFILER] getDashboardStatsAction finished in ${tTotal}ms`);
  console.log("Success Status:", res.success);
}

runDashboardTest()
  .catch(console.error);
