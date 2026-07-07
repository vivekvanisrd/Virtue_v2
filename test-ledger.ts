import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "./.env.local") });

import { calculateStudentLedger } from './src/lib/services/ledger-service';

// Set up mock context for testing
process.env.TEST_OVERRIDE_SOVEREIGN = "true";
process.env.TEST_ROLE = "DEVELOPER";
process.env.TEST_STAFF_ID = "operational-test-agent";

async function test() {
  const studentId = "0066cc6b-e62b-4a36-9e32-cacdad705b51";
  console.log(`Running ledger calculation for student ${studentId}...`);
  try {
    const ledger = await calculateStudentLedger(studentId);
    console.log("Ledger calculated successfully:", JSON.stringify(ledger, null, 2));
  } catch (err: any) {
    console.error("Ledger calculation failed:", err);
  }
}

test();
