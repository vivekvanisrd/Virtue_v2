import { getStaffProfileDetailsAction } from "../src/lib/actions/staff-document-actions";

async function runProfileTest() {
  console.log("⏱️  [PROFILER] Simulating Owner Impersonation of VIVES school...");
  
  // Set the environment variables that getSovereignIdentity checks for test override
  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_STAFF_ID = "VS9355-HQ-STF-000001";
  process.env.TEST_ROLE = "OWNER";
  process.env.TEST_SCHOOL_ID = "VIVES";
  process.env.TEST_BRANCH_ID = "VIVES-RCB";
  process.env.TEST_GLOBAL_DEV = "false";
  process.env.NODE_ENV = "development"; // Ensure NODE_ENV is set to allow test overrides

  const tStart = Date.now();
  
  const res = await getStaffProfileDetailsAction(undefined);
  
  const tTotal = Date.now() - tStart;
  console.log(`\n⏱️  [PROFILER] Server Action finished in ${tTotal}ms`);
  console.log("Success Status:", res.success);
  if (res.success) {
    console.log(`Loaded Staff: ${res.data?.firstName} ${res.data?.lastName} (${res.data?.staffCode})`);
    console.log(`Active Staff List Size: ${res.staffList?.length || 0}`);
  } else {
    console.log("Error:", res.error);
  }
}

runProfileTest()
  .catch(console.error);
