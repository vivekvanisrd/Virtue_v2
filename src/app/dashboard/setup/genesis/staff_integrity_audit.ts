/**
 * staff_integrity_audit.ts
 *
 * Microscopic post-import integrity audit for the Staff & Teachers module.
 * Checks every sub-table, data quality, placeholder values, and relational gaps.
 *
 * Run: npx tsx src/app/dashboard/setup/genesis/staff_integrity_audit.ts
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
  if (count > 0 && details.length > 0) {
    details.slice(0, 8).forEach((d) => console.log(`   → ${d}`));
    if (details.length > 8) console.log(`   ... and ${details.length - 8} more`);
  }
  results.push({ check, severity, count, details });
}

function fmtStaff(s: any) {
  return `${s.firstName} ${s.lastName} [${s.staffCode}] role:${s.role}`;
}

async function runAudit() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 VIRTUE V2 — STAFF & TEACHERS MICROSCOPIC AUDIT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const allStaff = await prisma.staff.findMany({
    select: {
      id: true,
      staffCode: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      dob: true,
      gender: true,
      username: true,
      passwordHash: true,
      branchId: true,
      schoolId: true,
      employeeCategory: true,
      employmentType: true,
      onboardingStatus: true,
      biometricId: true,
      bloodGroup: true,
      emergencyName: true,
      emergencyPhone: true,
      departmentId: true,
      categoryId: true,
      sovereignRoleId: true,
      identityVersion: true,
    }
  });

  const total = allStaff.length;
  console.log(`📋 Total Staff Records: ${total}\n`);
  if (total === 0) { console.log("⚠️  No staff found."); return; }

  const ids = allStaff.map((s) => s.id);

  // ── CHECK 1: Missing StaffProfessional (payroll will break) ──────────────
  const profs = await prisma.staffProfessional.findMany({ where: { staffId: { in: ids } }, select: { staffId: true, basicSalary: true, designation: true, dateOfJoining: true } });
  const withProf = new Set(profs.map((p) => p.staffId));
  const missingProf = allStaff.filter((s) => !withProf.has(s.id));
  log("Missing StaffProfessional record (payroll broken)", "CRITICAL", missingProf.length, missingProf.map(fmtStaff));

  // ── CHECK 2: Missing StaffStatutory (compliance gap) ─────────────────────
  const stats = await prisma.staffStatutory.findMany({ where: { staffId: { in: ids } }, select: { staffId: true } });
  const withStat = new Set(stats.map((s) => s.staffId));
  const missingStat = allStaff.filter((s) => !withStat.has(s.id));
  log("Missing StaffStatutory record (PAN/PF/ESI compliance gap)", "HIGH", missingStat.length, missingStat.map(fmtStaff));

  // ── CHECK 3: Missing StaffBank (salary transfer impossible) ──────────────
  const banks = await prisma.staffBank.findMany({ where: { staffId: { in: ids } }, select: { staffId: true, accountNumber: true, ifscCode: true, bankName: true } });
  const withBank = new Set(banks.map((b) => b.staffId));
  const missingBank = allStaff.filter((s) => !withBank.has(s.id));
  log("Missing StaffBank record (salary transfer impossible)", "HIGH", missingBank.length, missingBank.map(fmtStaff));

  // ── CHECK 4: StaffBank with placeholder values ────────────────────────────
  const placeholderBanks = banks.filter((b) =>
    b.accountNumber === "[REQ_VERIFY]" || b.accountNumber === "Pending" ||
    b.ifscCode === "[REQ_VERIFY]" || b.ifscCode === "" ||
    b.bankName === "[REQ_VERIFY]" || b.bankName === "Pending"
  );
  log(
    "StaffBank with placeholder/unverified values",
    "HIGH",
    placeholderBanks.length,
    placeholderBanks.map((b) => {
      const s = allStaff.find((st) => st.id === b.staffId);
      return `${fmtStaff(s!)} → Acct:${b.accountNumber} IFSC:${b.ifscCode}`;
    })
  );

  // ── CHECK 5: StaffProfessional with ZERO basicSalary ─────────────────────
  const zeroSalary = profs.filter((p) => Number(p.basicSalary) === 0);
  log(
    "StaffProfessional with ZERO basic salary (payroll dead)",
    "CRITICAL",
    zeroSalary.length,
    zeroSalary.map((p) => {
      const s = allStaff.find((st) => st.id === p.staffId);
      return fmtStaff(s!);
    })
  );

  // ── CHECK 6: StaffProfessional with placeholder designation ──────────────
  const placeholderDes = profs.filter((p) => p.designation === "[REQ_VERIFY]" || p.designation === "Staff");
  log(
    "StaffProfessional with placeholder designation",
    "MEDIUM",
    placeholderDes.length,
    placeholderDes.map((p) => {
      const s = allStaff.find((st) => st.id === p.staffId);
      return `${fmtStaff(s!)} → "${p.designation}"`;
    })
  );

  // ── CHECK 7: Staff with no username (can't log in) ───────────────────────
  const noUsername = allStaff.filter((s) => !s.username);
  log("Staff with no username (login impossible)", "CRITICAL", noUsername.length, noUsername.map(fmtStaff));

  // ── CHECK 8: Staff with no passwordHash (can't log in) ───────────────────
  const noPassword = allStaff.filter((s) => !s.passwordHash);
  log("Staff with no passwordHash (login impossible)", "CRITICAL", noPassword.length, noPassword.map(fmtStaff));

  // ── CHECK 9: Staff with fake/placeholder email ───────────────────────────
  const fakeEmail = allStaff.filter((s) => s.email && s.email.includes("@pending.com"));
  log("Staff with auto-generated placeholder email", "MEDIUM", fakeEmail.length, fakeEmail.map((s) => `${fmtStaff(s)} → ${s.email}`));

  // ── CHECK 10: Staff with placeholder phone (0000000000) ──────────────────
  const fakePhone = allStaff.filter((s) => s.phone === "0000000000" || s.phone === "0");
  log("Staff with placeholder phone number", "MEDIUM", fakePhone.length, fakePhone.map((s) => `${fmtStaff(s)} → ${s.phone}`));

  // ── CHECK 11: Staff with no DOB ──────────────────────────────────────────
  const noDob = allStaff.filter((s) => !s.dob);
  log("Staff with no Date of Birth (attendance policy gap)", "MEDIUM", noDob.length, noDob.map(fmtStaff));

  // ── CHECK 12: Staff with no gender ───────────────────────────────────────
  const noGender = allStaff.filter((s) => !s.gender || s.gender === "Other");
  log("Staff with no/default gender", "INFO", noGender.length, noGender.map(fmtStaff));

  // ── CHECK 13: Staff with INACTIVE status ─────────────────────────────────
  const inactive = allStaff.filter((s) => s.status?.toUpperCase() === "INACTIVE");
  log("Staff with INACTIVE status (review required)", "INFO", inactive.length, inactive.map(fmtStaff));

  // ── CHECK 14: Staff with no employeeCategory ─────────────────────────────
  const noCategory = allStaff.filter((s) => !s.employeeCategory);
  log("Staff with no employeeCategory (payroll bucketing broken)", "HIGH", noCategory.length, noCategory.map(fmtStaff));

  // ── CHECK 15: TEACHER role staff not assigned to a class ─────────────────
  const teachers = allStaff.filter((s) => ["TEACHER", "HOD", "CLASS_TEACHER"].includes(s.role?.toUpperCase() || ""));
  const classAssignedTeacherIds = new Set(
    (await prisma.staff.findMany({
      where: { id: { in: teachers.map((t) => t.id) }, assignedClassId: { not: null } },
      select: { id: true }
    })).map((s) => s.id)
  );
  const unassignedTeachers = teachers.filter((t) => !classAssignedTeacherIds.has(t.id));
  log("TEACHER staff with no class assignment", "MEDIUM", unassignedTeachers.length, unassignedTeachers.map(fmtStaff));

  // ── CHECK 16: Duplicate staffCode within a branch ────────────────────────
  const dupCodes = await prisma.staff.groupBy({
    by: ["branchId", "staffCode"],
    _count: { staffCode: true },
    having: { staffCode: { _count: { gt: 1 } } }
  });
  log("Duplicate staffCode in same branch", "CRITICAL", dupCodes.length, dupCodes.map((d) => `Code "${d.staffCode}" in branch ${d.branchId} (×${d._count.staffCode})`));

  // ── CHECK 17: Duplicate phone within a branch ─────────────────────────────
  const dupPhones = await prisma.staff.groupBy({
    by: ["branchId", "phone"],
    _count: { phone: true },
    having: { phone: { _count: { gt: 1 } } }
  });
  const realDupPhones = dupPhones.filter((d) => d.phone !== "0000000000" && d.phone !== null);
  log("Duplicate phone number in same branch", "HIGH", realDupPhones.length, realDupPhones.map((d) => `Phone "${d.phone}" ×${d._count.phone}`));

  // ── CHECK 18: Staff with V1 identityVersion (legacy, needs upgrade) ───────
  const v1Staff = allStaff.filter((s) => s.identityVersion === "V1" || !s.identityVersion);
  log("Staff on legacy V1 identity version", "INFO", v1Staff.length, v1Staff.map(fmtStaff));

  // ── CHECK 19: StaffStatutory with all-null compliance fields ─────────────
  const statRecords = await prisma.staffStatutory.findMany({
    where: { staffId: { in: ids } },
    select: { staffId: true, panNumber: true, pfNumber: true, uanNumber: true, esiNumber: true, aadhaarNumber: true }
  });
  const allNullStat = statRecords.filter((s) =>
    (!s.panNumber || s.panNumber === "[REQ_VERIFY]") &&
    (!s.pfNumber || s.pfNumber === "[REQ_VERIFY]") &&
    (!s.aadhaarNumber || s.aadhaarNumber === "[REQ_VERIFY]")
  );
  log(
    "StaffStatutory with ALL compliance fields empty/placeholder",
    "HIGH",
    allNullStat.length,
    allNullStat.map((s) => {
      const st = allStaff.find((x) => x.id === s.staffId);
      return fmtStaff(st!);
    })
  );

  // ── CHECK 20: Staff with no emergencyPhone (safety risk) ─────────────────
  const noEmergency = allStaff.filter((s) => !s.emergencyPhone || !s.emergencyName);
  log("Staff with no emergency contact info", "MEDIUM", noEmergency.length, noEmergency.map(fmtStaff));

  // ── CHECK 21: StaffProfessional with placeholder dateOfJoining ───────────
  const placeholderJoining = profs.filter((p) => {
    const d = new Date(p.dateOfJoining);
    // 2026-03-01 is the bulk import default
    return d.getFullYear() === 2026 && d.getMonth() === 2 && d.getDate() === 1;
  });
  log(
    "StaffProfessional with default import dateOfJoining (2026-03-01)",
    "MEDIUM",
    placeholderJoining.length,
    placeholderJoining.map((p) => {
      const s = allStaff.find((st) => st.id === p.staffId);
      return fmtStaff(s!);
    })
  );

  // ── CHECK 22: PRINCIPAL role — count sanity check ────────────────────────
  const principals = allStaff.filter((s) => s.role === "PRINCIPAL");
  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  if (principals.length !== branches.length) {
    log(
      `Principal count mismatch: ${principals.length} principals for ${branches.length} branches`,
      "HIGH",
      Math.abs(principals.length - branches.length),
      [`Expected 1 per branch. Principals found: ${principals.map((p) => p.staffCode).join(", ")}`]
    );
  } else {
    log("Principal count matches branch count", "INFO", 0, []);
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 STAFF AUDIT SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const critical = results.filter((r) => r.severity === "CRITICAL" && r.count > 0);
  const high = results.filter((r) => r.severity === "HIGH" && r.count > 0);
  const medium = results.filter((r) => r.severity === "MEDIUM" && r.count > 0);
  const info = results.filter((r) => r.severity === "INFO" && r.count > 0);
  console.log(`\n🔴 CRITICAL: ${critical.length} checks failed → ${critical.reduce((s, r) => s + r.count, 0)} records`);
  critical.forEach((r) => console.log(`   • ${r.check} — ${r.count}`));
  console.log(`\n🟠 HIGH:     ${high.length} checks failed → ${high.reduce((s, r) => s + r.count, 0)} records`);
  high.forEach((r) => console.log(`   • ${r.check} — ${r.count}`));
  console.log(`\n🟡 MEDIUM:   ${medium.length} flagged → ${medium.reduce((s, r) => s + r.count, 0)} records`);
  medium.forEach((r) => console.log(`   • ${r.check} — ${r.count}`));
  console.log(`\n🟢 INFO:     ${info.length} notes`);
  info.forEach((r) => console.log(`   • ${r.check} — ${r.count}`));
  console.log(`\n📌 Total Staff Audited: ${total}`);
  console.log("\n✅ Staff Audit Complete.\n");
}

runAudit()
  .catch((e) => { console.error("❌ Audit failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
