import { getStudentFeeStatus } from "../src/lib/actions/finance-actions";

async function runFeeTest() {
  console.log("⏱️  [PROFILER] Testing getStudentFeeStatus speed...");
  
  // Mock the active owner session context
  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_STAFF_ID = "341b73a6-6e1c-4be3-9d02-a3efdd9440fc";
  process.env.TEST_ROLE = "OWNER";
  process.env.TEST_SCHOOL_ID = "VIVES";
  process.env.TEST_BRANCH_ID = "VIVES-RCB";
  process.env.NODE_ENV = "development";

  const tStart = Date.now();
  const res = await getStudentFeeStatus("abc8d68a-541d-4c40-abf3-d7f32710ab84");
  const tTotal = Date.now() - tStart;
  
  console.log(`\n⏱️  [PROFILER] getStudentFeeStatus finished in ${tTotal}ms`);
  console.log("Success Status:", res.success);
}

runFeeTest()
  .catch(console.error);
