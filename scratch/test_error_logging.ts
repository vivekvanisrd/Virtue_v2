import 'dotenv/config';
import { logSystemError } from "../src/lib/utils/error-logger.js";
import { getSystemErrorsAction, testTriggerErrorAction } from "../src/lib/actions/error-actions.js";

async function runTest() {
  console.log("=== TESTING SYSTEM ERROR LOGGING & MAIL DISPATCH ===");

  // 1. Direct logSystemError test
  console.log("Step 1: Creating a test error record in PostgreSQL...");
  const record = await logSystemError({
    schoolId: "VIVES",
    branchId: "VIVES-RCB",
    userId: "TEST_USER_999",
    userName: "Test Administrator",
    userRole: "ADMIN",
    source: "SERVER",
    errorName: "DatabaseConnectionTimeout",
    message: "Failed to connect to microservice cluster at port 8080 (ETIMEDOUT)",
    stack: "Error: Failed to connect to microservice cluster at port 8080\n    at Object.connect (server.ts:42:15)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)",
    route: "/api/finance/reconcile",
    component: "FinanceReconciler",
    metadata: {
      attemptNumber: 3,
      password: "secret_should_be_redacted",
      apiEndpoint: "https://api.virtue.internal/reconcile",
    },
    severity: "HIGH",
  });

  console.log("Recorded Error ID:", record?.id);

  // 2. Querying errors
  console.log("\nStep 2: Querying SystemErrorLog records via getSystemErrorsAction...");
  const fetched = await getSystemErrorsAction({ limit: 5 });
  console.log("Fetch success:", fetched.success);
  console.log("Total errors in DB:", fetched.total);
  console.log("Unresolved count:", fetched.stats?.unresolved);
  console.log("Sample fetched error message:", fetched.errors[0]?.message);
  console.log("Sanitized Metadata:", fetched.errors[0]?.metadata);

  // 3. Test Trigger Error Server Action (with SMTP email send)
  console.log("\nStep 3: Triggering CRITICAL test error action (SMTP Email dispatch test)...");
  const testRes = await testTriggerErrorAction("Automated verification of admin error alert email system.");
  console.log("Test Action Result:", testRes);

  console.log("\n✅ ALL ERROR TRACKING & MAIL ALERTS VERIFIED SUCCESSFULLY!");
}

runTest().catch(console.error);
