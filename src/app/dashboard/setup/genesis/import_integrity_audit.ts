/**
 * import_integrity_audit.ts
 *
 * Comprehensive post-import data integrity audit.
 * Detects all orphaned, incomplete, or inconsistent student records
 * created by the bulk import pipeline.
 *
 * Run: npx ts-node --project tsconfig.json -e "require('./src/app/dashboard/setup/genesis/import_integrity_audit.ts')"
 * Or:  npx tsx src/app/dashboard/setup/genesis/import_integrity_audit.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuditResult {
  check: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  count: number;
  details: string[];
}

const results: AuditResult[] = [];

function log(check: string, severity: AuditResult["severity"], count: number, details: string[]) {
  const icon = severity === "CRITICAL" ? "🔴" : severity === "HIGH" ? "🟠" : severity === "MEDIUM" ? "🟡" : "🟢";
  console.log(`\n${icon} [${severity}] ${check}: ${count} issue(s)`);
  if (details.length > 0 && count > 0) {
    details.slice(0, 10).forEach((d) => console.log(`   → ${d}`));
    if (details.length > 10) console.log(`   ... and ${details.length - 10} more`);
  }
  results.push({ check, severity, count, details });
}

async function runAudit() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 VIRTUE V2 — POST-IMPORT INTEGRITY AUDIT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── SCOPE: Active students only ──────────────────────────────────────────
  const allStudents = await prisma.student.findMany({
    where: { status: { in: ["Active", "ACTIVE"] } },
    select: { id: true, studentCode: true, firstName: true, lastName: true, schoolId: true, branchId: true }
  });

  const total = allStudents.length;
  console.log(`📋 Total Active Students in Database: ${total}\n`);
  if (total === 0) {
    console.log("⚠️  No active students found. Exiting audit.");
    return;
  }

  const studentIds = allStudents.map((s) => s.id);

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 1: Missing AcademicRecord (student has no class assignment)
  // ─────────────────────────────────────────────────────────────────────────
  const academicRecords = await prisma.academicRecord.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true }
  });
  const studentsWithAcademic = new Set(academicRecords.map((r) => r.studentId));
  const missingAcademic = allStudents.filter((s) => !studentsWithAcademic.has(s.id));
  log(
    "Missing AcademicRecord (no class assignment)",
    "CRITICAL",
    missingAcademic.length,
    missingAcademic.map((s) => `${s.firstName} ${s.lastName || ""} [${s.studentCode}]`)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 2: Missing StudentAcademicYear (no enrollment history)
  // ─────────────────────────────────────────────────────────────────────────
  const academicYears = await prisma.studentAcademicYear.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true }
  });
  const studentsWithAY = new Set(academicYears.map((r) => r.studentId));
  const missingAY = allStudents.filter((s) => !studentsWithAY.has(s.id));
  log(
    "Missing StudentAcademicYear (no enrollment record)",
    "CRITICAL",
    missingAY.length,
    missingAY.map((s) => `${s.firstName} ${s.lastName || ""} [${s.studentCode}]`)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 3: Missing FinancialRecord (cannot be billed)
  // ─────────────────────────────────────────────────────────────────────────
  const financials = await prisma.financialRecord.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true, annualTuition: true }
  });
  const studentsWithFin = new Set(financials.map((f) => f.studentId));
  const missingFin = allStudents.filter((s) => !studentsWithFin.has(s.id));
  log(
    "Missing FinancialRecord (student cannot be billed)",
    "CRITICAL",
    missingFin.length,
    missingFin.map((s) => `${s.firstName} ${s.lastName || ""} [${s.studentCode}]`)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 4: FinancialRecord with ZERO annualTuition (no fee amount set)
  // ─────────────────────────────────────────────────────────────────────────
  const zeroFeeFinancials = financials.filter(
    (f) => studentsWithFin.has(f.studentId) && Number(f.annualTuition) === 0
  );
  const zeroFeeIds = new Set(zeroFeeFinancials.map((f) => f.studentId));
  const zeroFeeStudents = allStudents.filter((s) => zeroFeeIds.has(s.id));
  log(
    "FinancialRecord with ZERO annual tuition (billing blind spot)",
    "HIGH",
    zeroFeeStudents.length,
    zeroFeeStudents.map((s) => `${s.firstName} ${s.lastName || ""} [${s.studentCode}]`)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 5: Missing StudentGuardian linkage (no parent linked)
  // ─────────────────────────────────────────────────────────────────────────
  const guardianLinks = await prisma.studentGuardian.findMany({
    where: { studentId: { in: studentIds }, activeStatus: "ACTIVE" },
    select: { studentId: true }
  });
  const studentsWithGuardian = new Set(guardianLinks.map((g) => g.studentId));
  const missingGuardian = allStudents.filter((s) => !studentsWithGuardian.has(s.id));
  log(
    "Missing Guardian linkage (parent portal access broken)",
    "HIGH",
    missingGuardian.length,
    missingGuardian.map((s) => `${s.firstName} ${s.lastName || ""} [${s.studentCode}]`)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 6: Missing FamilyDetail record
  // ─────────────────────────────────────────────────────────────────────────
  const familyDetails = await prisma.familyDetail.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true }
  });
  const studentsWithFamily = new Set(familyDetails.map((f) => f.studentId));
  const missingFamily = allStudents.filter((s) => !studentsWithFamily.has(s.id));
  log(
    "Missing FamilyDetail record (contact info incomplete)",
    "MEDIUM",
    missingFamily.length,
    missingFamily.map((s) => `${s.firstName} ${s.lastName || ""} [${s.studentCode}]`)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 7: Missing Address record
  // ─────────────────────────────────────────────────────────────────────────
  const addresses = await prisma.address.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true }
  });
  const studentsWithAddress = new Set(addresses.map((a) => a.studentId));
  const missingAddress = allStudents.filter((s) => !studentsWithAddress.has(s.id));
  log(
    "Missing Address record",
    "MEDIUM",
    missingAddress.length,
    missingAddress.map((s) => `${s.firstName} ${s.lastName || ""} [${s.studentCode}]`)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 8: Missing FeeInvoice (financial record exists but no invoice)
  // ─────────────────────────────────────────────────────────────────────────
  const invoices = await prisma.feeInvoice.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true }
  });
  const studentsWithInvoice = new Set(invoices.map((i) => i.studentId));
  // Only flag students who HAVE a financial record but no invoice
  const missingInvoice = allStudents.filter(
    (s) => studentsWithFin.has(s.id) && !studentsWithInvoice.has(s.id) && !zeroFeeIds.has(s.id)
  );
  log(
    "Missing FeeInvoice (has fee record but no invoice generated)",
    "HIGH",
    missingInvoice.length,
    missingInvoice.map((s) => `${s.firstName} ${s.lastName || ""} [${s.studentCode}]`)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 9: Missing StudentFeeComponent (no fee components linked)
  // ─────────────────────────────────────────────────────────────────────────
  const feeComponentsRaw = await prisma.studentFeeComponent.findMany({
    where: { financialRecord: { studentId: { in: studentIds } } },
    select: { studentFinancialId: true, financialRecord: { select: { studentId: true } } }
  });
  const studentsWithComponents = new Set(feeComponentsRaw.map((fc: any) => fc.financialRecord.studentId));
  const missingComponents = allStudents.filter(
    (s) => studentsWithFin.has(s.id) && !studentsWithComponents.has(s.id) && !zeroFeeIds.has(s.id)
  );
  log(
    "Missing StudentFeeComponent (fee structure not linked to student)",
    "HIGH",
    missingComponents.length,
    missingComponents.map((s) => `${s.firstName} ${s.lastName || ""} [${s.studentCode}]`)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 10: AcademicRecord with NULL sectionId (section not assigned)
  // ─────────────────────────────────────────────────────────────────────────
  const recordsWithoutSection = await prisma.academicRecord.findMany({
    where: { studentId: { in: studentIds }, sectionId: null },
    include: { class: { select: { name: true } } }
  });
  log(
    "AcademicRecord with no section assigned",
    "MEDIUM",
    recordsWithoutSection.length,
    recordsWithoutSection.map((r: any) => {
      const s = allStudents.find((st) => st.id === r.studentId);
      return `${s?.firstName} ${s?.lastName || ""} [${s?.studentCode}] → Class: ${r.class?.name || "?"} (${r.academicYear})`;
    })
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 11: Duplicate studentCode (import ran twice for same code)
  // ─────────────────────────────────────────────────────────────────────────
  const allCodes = await prisma.student.groupBy({
    by: ["studentCode"],
    _count: { studentCode: true },
    having: { studentCode: { _count: { gt: 1 } } }
  });
  log(
    "Duplicate studentCode (import collision)",
    "CRITICAL",
    allCodes.length,
    allCodes.map((c) => `Code "${c.studentCode}" appears ${c._count.studentCode}x`)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 12: Guardian with NO linked students (orphaned guardian)
  // ─────────────────────────────────────────────────────────────────────────
  const allGuardians = await prisma.guardian.findMany({ select: { id: true, firstName: true, phone: true } });
  const linkedGuardianIds = new Set(
    (await prisma.studentGuardian.findMany({ select: { guardianId: true } })).map((g) => g.guardianId)
  );
  const orphanedGuardians = allGuardians.filter((g) => !linkedGuardianIds.has(g.id));
  log(
    "Orphaned Guardian records (guardian with no linked students)",
    "MEDIUM",
    orphanedGuardians.length,
    orphanedGuardians.map((g) => `${g.firstName} [${g.phone}]`)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 13: StudentAcademicYear with PENDING promotion/renewal (stuck state)
  // ─────────────────────────────────────────────────────────────────────────
  const stuckAY = await prisma.studentAcademicYear.count({
    where: {
      studentId: { in: studentIds },
      promotionStatus: "PENDING",
      renewalStatus: "PENDING"
    }
  });
  log(
    "StudentAcademicYear in PENDING promotion/renewal state",
    "INFO",
    stuckAY,
    stuckAY > 0 ? [`${stuckAY} students are in PENDING state — expected for newly imported students`] : []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 14: Students missing DOB (required for attendance/reports)
  // ─────────────────────────────────────────────────────────────────────────
  const missingDob = await prisma.student.count({
    where: { id: { in: studentIds }, dob: null }
  });
  log(
    "Students with no Date of Birth",
    "MEDIUM",
    missingDob,
    missingDob > 0 ? [`${missingDob} students missing DOB — affects age-group reports`] : []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK 15: Students with PLACEHOLDER address (import default)
  // ─────────────────────────────────────────────────────────────────────────
  const placeholderAddress = await prisma.address.count({
    where: {
      studentId: { in: studentIds },
      currentAddress: { contains: "VIVES Campus Student Address" }
    }
  });
  log(
    "Students with placeholder address (not updated post-import)",
    "MEDIUM",
    placeholderAddress,
    placeholderAddress > 0 ? [`${placeholderAddress} students still have default import address`] : []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 AUDIT SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const critical = results.filter((r) => r.severity === "CRITICAL" && r.count > 0);
  const high = results.filter((r) => r.severity === "HIGH" && r.count > 0);
  const medium = results.filter((r) => r.severity === "MEDIUM" && r.count > 0);
  console.log(`\n🔴 CRITICAL: ${critical.length} checks failed`);
  critical.forEach((r) => console.log(`   • ${r.check} — ${r.count} records`));
  console.log(`\n🟠 HIGH:     ${high.length} checks failed`);
  high.forEach((r) => console.log(`   • ${r.check} — ${r.count} records`));
  console.log(`\n🟡 MEDIUM:   ${medium.length} checks flagged`);
  medium.forEach((r) => console.log(`   • ${r.check} — ${r.count} records`));

  const totalIssues = results.reduce((s, r) => s + (r.severity !== "INFO" ? r.count : 0), 0);
  console.log(`\n📌 Total Issues Found: ${totalIssues}`);
  console.log(`📌 Students Audited:   ${total}`);
  console.log("\n✅ Audit Complete.\n");
}

runAudit()
  .catch((e) => {
    console.error("❌ Audit failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
