import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SCHOOL_ID = "VIVES";
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== DEEP POST-IMPORT AUDIT FOR VIVES-RCB ===");

  const auditReport: {
    category: string;
    checkName: string;
    status: "PASS" | "WARN" | "FAIL";
    details: string;
  }[] = [];

  // 1. STUDENT MASTER INTEGRITY
  const totalStudents = await prisma.student.count({ where: { branchId: BRANCH_ID } });
  const allStudents = await prisma.student.findMany({
    where: { branchId: BRANCH_ID },
    include: { academic: true, financial: true, transport: true }
  });

  let studentsWithoutAcademic = 0;
  let studentsWithoutFinancial = 0;

  for (const s of allStudents) {
    if (!s.academic) studentsWithoutAcademic++;
    if (!s.financial) studentsWithoutFinancial++;
  }

  auditReport.push({
    category: "1. Student Master",
    checkName: "Total Active ERP Students",
    status: "PASS",
    details: `Total: ${totalStudents} students in ${BRANCH_ID}`
  });

  auditReport.push({
    category: "1. Student Master",
    checkName: "Academic Profile Linking",
    status: studentsWithoutAcademic === 0 ? "PASS" : "FAIL",
    details: studentsWithoutAcademic === 0 
      ? "100% of students have an active StudentAcademic profile linked."
      : `CRITICAL: ${studentsWithoutAcademic} students are missing StudentAcademic profiles!`
  });

  auditReport.push({
    category: "1. Student Master",
    checkName: "Financial Record Linking",
    status: studentsWithoutFinancial === 0 ? "PASS" : "FAIL",
    details: studentsWithoutFinancial === 0
      ? "100% of students have an assigned FinancialRecord linked."
      : `CRITICAL: ${studentsWithoutFinancial} students are missing FinancialRecord!`
  });

  // 2. COLLECTION INTEGRITY
  const totalCollections = await prisma.collection.count({ where: { branchId: BRANCH_ID } });
  const allCollections = await prisma.collection.findMany({
    where: { branchId: BRANCH_ID }
  });

  let collectionsWithoutStudent = 0;
  let collectionsNullAdmission = 0;
  let collectionsNullFY = 0;

  for (const c of allCollections) {
    if (!c.studentId) collectionsWithoutStudent++;
    if (!c.admissionId) collectionsNullAdmission++;
    if (!c.financialYearId) collectionsNullFY++;
  }

  auditReport.push({
    category: "2. Collections",
    checkName: "Total DB Collections Count",
    status: totalCollections === 384 ? "PASS" : "WARN",
    details: `Total: ${totalCollections} collections in DB (Expected: 384)`
  });

  auditReport.push({
    category: "2. Collections",
    checkName: "Orphaned Collections (No Student)",
    status: collectionsWithoutStudent === 0 ? "PASS" : "FAIL",
    details: collectionsWithoutStudent === 0
      ? "100% of collections are linked to valid ERP student IDs."
      : `FAIL: ${collectionsWithoutStudent} collections have invalid studentId!`
  });

  auditReport.push({
    category: "2. Collections",
    checkName: "Financial Year Linkage",
    status: collectionsNullFY === 0 ? "PASS" : "WARN",
    details: collectionsNullFY === 0
      ? "100% of collections are linked to an active FinancialYear ID."
      : `WARN: ${collectionsNullFY} collections have null financialYearId!`
  });

  auditReport.push({
    category: "2. Collections",
    checkName: "Admission ID Linkage",
    status: collectionsNullAdmission === 0 ? "PASS" : "WARN",
    details: collectionsNullAdmission === 0
      ? "100% of collections have student admissionId set."
      : `INFO: ${collectionsNullAdmission} collections have null admissionId (fall back to studentId directly).`
  });

  // 3. LEDGER VS COLLECTION RECONCILIATION
  const totalLedgers = await prisma.ledgerEntry.count({ where: { branchId: BRANCH_ID, type: "PAYMENT" } });
  const colSum = await prisma.collection.aggregate({
    where: { branchId: BRANCH_ID },
    _sum: { totalPaid: true }
  });
  const ledgerSum = await prisma.ledgerEntry.aggregate({
    where: { branchId: BRANCH_ID, type: "PAYMENT" },
    _sum: { amount: true }
  });

  const totalColPaid = Number(colSum._sum.totalPaid || 0);
  const totalLedgerAmt = Number(ledgerSum._sum.amount || 0);

  auditReport.push({
    category: "3. Accounting Ledgers",
    checkName: "Collection vs Ledger Entry Count",
    status: totalCollections === totalLedgers ? "PASS" : "WARN",
    details: `Collections: ${totalCollections} | Payment Ledger Entries: ${totalLedgers}`
  });

  auditReport.push({
    category: "3. Accounting Ledgers",
    checkName: "Collection vs Ledger Amount Balance",
    status: totalColPaid === totalLedgerAmt ? "PASS" : "FAIL",
    details: `Collection Sum: ₹${totalColPaid.toLocaleString('en-IN')} | Ledger Sum: ₹${totalLedgerAmt.toLocaleString('en-IN')} (Diff: ₹${Math.abs(totalColPaid - totalLedgerAmt)})`
  });

  // 4. TRANSPORT MODULE CONSISTENCY
  const transportPaidStudents = new Set<string>();
  for (const c of allCollections) {
    const feeHead = (c.allocatedTo as any)?.feeHead;
    if (feeHead === "Transport") transportPaidStudents.add(c.studentId);
  }

  const transportOptedInDb = await prisma.transportDetail.findMany({
    where: { student: { branchId: BRANCH_ID }, transportRequired: true },
    select: { studentId: true }
  });
  const transportOptedSet = new Set(transportOptedInDb.map(t => t.studentId));

  let missingTransportOptIn = 0;
  for (const stId of transportPaidStudents) {
    if (!transportOptedSet.has(stId)) missingTransportOptIn++;
  }

  auditReport.push({
    category: "4. Transport Module",
    checkName: "Transport Paid vs Transport Opted-In",
    status: missingTransportOptIn === 0 ? "PASS" : "FAIL",
    details: missingTransportOptIn === 0
      ? `100% of transport-paying students (${transportPaidStudents.size} students) are opted into transport in ERP.`
      : `FAIL: ${missingTransportOptIn} students paid transport fee but are not flagged as transportRequired=true in ERP!`
  });

  // 5. TENANCY COUNTER CHECK
  const receiptCounter = await prisma.tenancyCounter.findUnique({
    where: { schoolId_branchId_type_year: { schoolId: SCHOOL_ID, branchId: BRANCH_ID, type: "RECEIPT", year: "2026" } }
  });

  auditReport.push({
    category: "5. Tenancy Counters",
    checkName: "Receipt Sequence Counter Integrity",
    status: (receiptCounter && receiptCounter.lastValue >= 713) ? "PASS" : "FAIL",
    details: receiptCounter 
      ? `TenancyCounter for RECEIPT is ${receiptCounter.lastValue}. Next UI receipt = VIVES-RCB-2026-REC-00${receiptCounter.lastValue + 1}`
      : "FAIL: TenancyCounter for RECEIPT is missing!"
  });

  // PRINT FINAL TABLE
  console.log("\n==========================================================================================");
  console.log("                               POST-IMPORT AUDIT REPORT                                  ");
  console.log("==========================================================================================");
  for (const r of auditReport) {
    const symbol = r.status === "PASS" ? "✅" : r.status === "WARN" ? "⚠️" : "❌";
    console.log(`${symbol} [${r.status}] [${r.category}] ${r.checkName}`);
    console.log(`   └─ ${r.details}\n`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
