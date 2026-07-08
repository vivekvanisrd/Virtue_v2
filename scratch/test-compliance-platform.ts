import prisma, { prismaBypass } from "../src/lib/prisma";
import { StatutoryPluginRegistry } from "../src/lib/services/statutory/plugin-registry";
import { EPFOAdapter } from "../src/lib/services/statutory/adapters/epfo-adapter";
import { CalculationEngine } from "../src/lib/services/statutory/calculation-engine";

async function main() {
  console.log("🧪 [TEST] Registering EPFO Adapter...");
  StatutoryPluginRegistry.registerAdapter(new EPFOAdapter());

  const schoolId = "VIVES";
  const branchId = "VIVES-RCB";
  const staffId = "341b73a6-6e1c-4be3-9d02-a3efdd9440fc"; // Active mock staff ID
  const payrollRunId = "mock-payroll-run-123";
  const targetDate = new Date();

  // 1. Clean previous mock runs & masters
  console.log("🧹 [TEST] Cleaning previous test states...");
  await prismaBypass.calculationTrace.deleteMany({ where: { payrollRunId } }).catch(() => {});
  await prismaBypass.payrollSnapshot.deleteMany({ where: { payrollRunId } }).catch(() => {});
  await prismaBypass.uANMaster.deleteMany({ where: { staffId } }).catch(() => {});
  await prismaBypass.nomineeMaster.deleteMany({ where: { staffId } }).catch(() => {});
  await prismaBypass.kYCMaster.deleteMany({ where: { staffId } }).catch(() => {});
  await prismaBypass.statutoryRule.deleteMany({ configHeader: { schoolId, type: "EPFO" } }).catch(() => {});
  await prismaBypass.statutoryConfigHeader.deleteMany({ where: { schoolId, type: "EPFO" } }).catch(() => {});

  // 2. Setup mock rule configurations
  console.log("⚙️ [TEST] Creating mock rule headers...");
  const configHeader = await prismaBypass.statutoryConfigHeader.create({
    data: {
      schoolId,
      type: "EPFO",
      scope: "PLATFORM",
      scopeId: "GLOBAL",
      version: 1,
      status: "ACTIVE",
      createdBy: "TEST_RUNNER",
      effectiveFrom: new Date(targetDate.getTime() - 24*60*60*1000),
      rules: {
        createMany: {
          data: [
            { parameter: "PF_RATE", value: "0.12", datatype: "DECIMAL" },
            { parameter: "EPS_RATE", value: "0.0833", datatype: "DECIMAL" },
            { parameter: "EDLI_RATE", value: "0.005", datatype: "DECIMAL" },
            { parameter: "ADMIN_RATE", value: "0.005", datatype: "DECIMAL" },
            { parameter: "WAGE_CEILING", value: "15000", datatype: "DECIMAL" }
          ]
        }
      }
    }
  });
  console.log(`Mock rule header created with version ${configHeader.version}`);

  // 3. Setup mock employee masters
  console.log("👤 [TEST] Creating mock UAN, KYC and Nominees...");
  await prismaBypass.uANMaster.create({
    data: {
      staffId,
      uan: "100987654321",
      status: "ACTIVE"
    }
  });

  await prismaBypass.kYCMaster.createMany({
    data: [
      { staffId, documentType: "AADHAAR", documentNumber: "1234-5678-9012", status: "VERIFIED" },
      { staffId, documentType: "PAN", documentNumber: "ABCDE1234F", status: "VERIFIED" },
      { staffId, documentType: "BANK_ACCOUNT", documentNumber: "9876543210", status: "VERIFIED" }
    ]
  });

  await prismaBypass.nomineeMaster.create({
    data: {
      staffId,
      name: "Jane Doe",
      relationship: "Spouse",
      dob: new Date("1992-05-15"),
      percentage: 100,
      address: "123 Test Street",
      isActive: true
    }
  });

  // 4. Execute calculation engine
  console.log("⚡ [TEST] Executing Statutory Calculation Engine...");
  const res = await CalculationEngine.calculateStatutoryDeductions(
    schoolId,
    payrollRunId,
    staffId,
    {
      basicSalary: 12000,
      daAmount: 4000,
      hraAmount: 5000,
      otherAllowances: 2000,
      grossSalary: 23000,
      lwpDays: 0
    },
    targetDate,
    { branchId }
  );

  console.log("\n✅ [TEST] Calculation Result:");
  console.log(res);

  // 5. Inspect database traces & snapshots
  const traces = await prismaBypass.calculationTrace.findMany({
    where: { payrollRunId }
  });
  console.log("\n📊 [TEST] calculationTraces logged in database:");
  traces.forEach(t => {
    console.log(`- Step: ${t.step} | Formula: ${t.formula} | Input: ${t.input} | Output: ${t.output}`);
  });

  const snapshot = await prismaBypass.payrollSnapshot.findFirst({
    where: { payrollRunId }
  });
  console.log("\n📦 [TEST] Frozen snapshot verification hash:", snapshot?.hash);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
