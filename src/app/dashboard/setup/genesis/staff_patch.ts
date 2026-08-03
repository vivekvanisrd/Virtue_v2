/**
 * staff_patch.ts
 *
 * Auto-fix all CRITICAL and HIGH issues found by staff_integrity_audit.ts.
 *
 * PATCH 1 (AUTO): Generate usernames for 56 teachers with no username
 * PATCH 2 (AUTO): Derive + stamp employeeCategory for 69 staff with null value
 * PATCH 3 (AUTO): Create skeleton StaffProfessional for 27 staff missing it
 * PATCH 4 (AUTO): Create skeleton StaffStatutory for 24 staff missing it
 * PATCH 5 (AUTO): Create skeleton StaffBank for 27 staff missing it
 * PATCH 6 (AUTO): Upgrade V1 → V2 identityVersion for imported staff
 * REPORT  (MANUAL): List teachers needing class assignment, principal gaps
 *
 * Run: npx tsx src/app/dashboard/setup/genesis/staff_patch.ts
 */

import { PrismaClient, EmployeeCategory } from "@prisma/client";

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveCategory(role: string | null): string {
  const r = (role || "").toUpperCase().replace(/\s+/g, "_");
  if (["OWNER", "FOUNDER", "CO_FOUNDER", "CORRESPONDENT"].includes(r)) return "OWNER";
  if (["PRINCIPAL", "VICE_PRINCIPAL", "DIRECTOR", "MANAGEMENT"].includes(r)) return "MANAGEMENT";
  if (["TEACHER", "HOD", "CLASS_TEACHER", "PRT", "TGT", "PGT", "LIBRARIAN"].includes(r)) return "TEACHING";
  if (["DRIVER", "CONDUCTOR"].includes(r)) return "TRANSPORT";
  if (["ATTENDANT", "AAYA", "SWEEPER", "PEON", "SECURITY", "SUPPORT"].includes(r)) return "SUPPORT";
  return "NON_TEACHING";
}

function makeUsername(firstName: string, staffCode: string): string {
  const base = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  const suffix = staffCode.slice(-4).toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${base}_${suffix}`;
}

async function runPatch() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔧 VIRTUE V2 — STAFF AUTO-PATCH");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const allStaff = await prisma.staff.findMany({
    select: {
      id: true, staffCode: true, firstName: true, lastName: true,
      role: true, branchId: true, schoolId: true,
      username: true, employeeCategory: true, identityVersion: true,
      professional: { select: { staffId: true } },
      statutory: { select: { staffId: true } },
      bank: { select: { staffId: true } }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH 1: Generate usernames for staff with no username
  // ─────────────────────────────────────────────────────────────────────────
  console.log("🔧 [PATCH 1] Generating usernames for staff without login access...");
  const noUsername = allStaff.filter((s) => !s.username);
  let usernameFixed = 0;
  const usedUsernames = new Set(
    (await prisma.staff.findMany({ where: { username: { not: null } }, select: { username: true } }))
      .map((s) => s.username!)
  );

  for (const s of noUsername) {
    let candidate = makeUsername(s.firstName, s.staffCode);
    // Ensure uniqueness
    let attempt = 0;
    while (usedUsernames.has(candidate)) {
      attempt++;
      candidate = `${makeUsername(s.firstName, s.staffCode)}${attempt}`;
    }
    usedUsernames.add(candidate);

    await prisma.staff.update({
      where: { id: s.id },
      data: { username: candidate }
    });
    usernameFixed++;
  }
  console.log(`   ✅ Usernames generated: ${usernameFixed}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH 2: Derive + stamp employeeCategory for staff with null value
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n🔧 [PATCH 2] Stamping employeeCategory derived from role...");
  const noCategory = allStaff.filter((s) => !s.employeeCategory);
  let categoryFixed = 0;

  // Batch by derived category
  const categoryGroups: Record<string, string[]> = {};
  for (const s of noCategory) {
    const cat = deriveCategory(s.role);
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(s.id);
  }

  for (const [cat, ids] of Object.entries(categoryGroups)) {
    const result = await prisma.staff.updateMany({
      where: { id: { in: ids } },
      data: { employeeCategory: cat as EmployeeCategory }
    });
    categoryFixed += result.count;
    console.log(`   → ${cat}: ${result.count} staff updated`);
  }
  console.log(`   ✅ employeeCategory stamped: ${categoryFixed}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH 3: Create skeleton StaffProfessional for staff missing it
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n🔧 [PATCH 3] Creating skeleton StaffProfessional records...");
  const missingProf = allStaff.filter((s) => !s.professional);
  let profFixed = 0;

  for (const s of missingProf) {
    try {
      await prisma.staffProfessional.create({
        data: {
          staffId: s.id,
          schoolId: s.schoolId,
          branchId: s.branchId,
          designation: s.role === "PRINCIPAL" ? "Principal" : s.role === "VICE_PRINCIPAL" ? "Vice Principal" : "Teacher",
          department: "Academics",
          qualification: null,
          experienceYears: 0,
          dateOfJoining: new Date(),
          basicSalary: 0   // Marked as zero — needs manual update
        }
      });
      profFixed++;
    } catch (e: any) {
      // Already exists (race) — skip
      if (!e.message.includes("Unique")) console.error(`   ⚠️  Prof create failed for ${s.staffCode}:`, e.message);
    }
  }
  console.log(`   ✅ StaffProfessional skeletons created: ${profFixed}`);
  if (profFixed > 0) console.log(`   ⚠️  Note: basicSalary is set to 0 — update salary for each via staff profile.`);

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH 4: Create skeleton StaffStatutory for staff missing it
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n🔧 [PATCH 4] Creating skeleton StaffStatutory records...");
  const missingStat = allStaff.filter((s) => !s.statutory);
  let statFixed = 0;

  for (const s of missingStat) {
    try {
      await prisma.staffStatutory.create({
        data: {
          staffId: s.id,
          schoolId: s.schoolId,
          branchId: s.branchId,
          panNumber: null,
          pfNumber: null,
          uanNumber: null,
          esiNumber: null,
          aadhaarNumber: null
        }
      });
      statFixed++;
    } catch (e: any) {
      if (!e.message.includes("Unique")) console.error(`   ⚠️  Stat create failed for ${s.staffCode}:`, e.message);
    }
  }
  console.log(`   ✅ StaffStatutory skeletons created: ${statFixed}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH 5: Create skeleton StaffBank for staff missing it
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n🔧 [PATCH 5] Creating skeleton StaffBank records (marked Pending)...");
  const missingBank = allStaff.filter((s) => !s.bank);
  let bankFixed = 0;

  for (const s of missingBank) {
    try {
      await prisma.staffBank.create({
        data: {
          staffId: s.id,
          schoolId: s.schoolId,
          branchId: s.branchId,
          accountName: `${s.firstName} ${s.lastName}`,
          accountNumber: "PENDING",
          ifscCode: "PENDING",
          bankName: "PENDING"
        }
      });
      bankFixed++;
    } catch (e: any) {
      if (!e.message.includes("Unique")) console.error(`   ⚠️  Bank create failed for ${s.staffCode}:`, e.message);
    }
  }
  console.log(`   ✅ StaffBank skeletons created: ${bankFixed}`);
  if (bankFixed > 0) console.log(`   ⚠️  Note: All set to PENDING — update bank details for each staff member.`);

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH 6: Upgrade V1 → V2 identityVersion for all bulk-imported staff
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n🔧 [PATCH 6] Upgrading legacy V1 → V2 identity version...");
  const v1Result = await prisma.staff.updateMany({
    where: { identityVersion: "V1" },
    data: { identityVersion: "V2" }
  });
  console.log(`   ✅ Identity version upgraded: ${v1Result.count} staff`);

  // Fix placeholder StaffBank (Manjula Reddy case)
  console.log("\n🔧 [PATCH 7] Normalising placeholder bank values to PENDING...");
  const pendingBankResult = await prisma.staffBank.updateMany({
    where: {
      OR: [
        { accountNumber: "Pending" },
        { ifscCode: "" },
        { bankName: "Pending" }
      ]
    },
    data: {
      accountNumber: "PENDING",
      ifscCode: "PENDING",
      bankName: "PENDING"
    }
  });
  console.log(`   ✅ Placeholder bank records normalised: ${pendingBankResult.count}`);

  // ─────────────────────────────────────────────────────────────────────────
  // REPORTS — Manual action items
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 MANUAL ACTION REPORTS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Report A: Zero salary staff (need manual salary entry)
  const zeroSalary = await prisma.staffProfessional.findMany({
    where: { basicSalary: 0 },
    select: { staffId: true, staff: { select: { firstName: true, lastName: true, staffCode: true, role: true } } }
  });
  console.log(`\n📋 [REPORT A] Staff with ZERO salary (manual update required): ${zeroSalary.length}`);
  zeroSalary.slice(0, 15).forEach((p) =>
    console.log(`   → ${p.staff.firstName} ${p.staff.lastName} [${p.staff.staffCode}] role:${p.staff.role}`)
  );
  if (zeroSalary.length > 15) console.log(`   ... and ${zeroSalary.length - 15} more`);

  // Report B: Teachers without class assignment
  const unassignedTeachers = await prisma.staff.findMany({
    where: {
      role: { in: ["TEACHER", "Teacher", "HOD", "CLASS_TEACHER"] },
      assignedClassId: null
    },
    select: { firstName: true, lastName: true, staffCode: true, role: true },
    orderBy: { staffCode: "asc" }
  });
  console.log(`\n📋 [REPORT B] Teachers without class assignment (${unassignedTeachers.length}):`);
  console.log(`   💡 Action: Assign class teachers via Settings → Staff → Class Assignment`);
  unassignedTeachers.slice(0, 10).forEach((t) =>
    console.log(`   → ${t.firstName} ${t.lastName} [${t.staffCode}]`)
  );
  if (unassignedTeachers.length > 10) console.log(`   ... and ${unassignedTeachers.length - 10} more`);

  // Report C: Branches without a principal
  const branches = await prisma.branch.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" }
  });
  const principalBranchIds = new Set(
    (await prisma.staff.findMany({
      where: { role: { in: ["PRINCIPAL", "Principal"] } },
      select: { branchId: true }
    })).map((p) => p.branchId)
  );
  const branchesWithoutPrincipal = branches.filter((b) => !principalBranchIds.has(b.id));
  console.log(`\n📋 [REPORT C] Branches without a Principal (${branchesWithoutPrincipal.length}):`);
  console.log(`   💡 Action: Use Settings → Appoint Principal for each missing branch`);
  branchesWithoutPrincipal.forEach((b) => console.log(`   → ${b.name} [${b.code}]`));

  // Report D: Staff with PENDING bank details
  const pendingBanks = await prisma.staffBank.count({ where: { accountNumber: "PENDING" } });
  console.log(`\n📋 [REPORT D] Staff with PENDING bank details: ${pendingBanks}`);
  console.log(`   💡 Action: Update via Staff Profile → Financial Vault → Bank Details`);

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 PATCH SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   ✅ Usernames generated:           ${usernameFixed}`);
  console.log(`   ✅ employeeCategory stamped:      ${categoryFixed}`);
  console.log(`   ✅ StaffProfessional created:     ${profFixed}`);
  console.log(`   ✅ StaffStatutory created:        ${statFixed}`);
  console.log(`   ✅ StaffBank skeletons created:   ${bankFixed}`);
  console.log(`   ✅ Identity version upgraded:     ${v1Result.count}`);
  console.log(`   ✅ Placeholder banks normalised:  ${pendingBankResult.count}`);
  console.log("\n📝 MANUAL ACTIONS REMAINING:");
  console.log(`   → Update salary for ${zeroSalary.length} staff`);
  console.log(`   → Assign classes to ${unassignedTeachers.length} teachers`);
  console.log(`   → Appoint principals for ${branchesWithoutPrincipal.length} branches`);
  console.log(`   → Update bank details for ${pendingBanks} staff`);
  console.log("\n✅ Auto-Patch Complete.\n");
}

runPatch()
  .catch((e) => { console.error("❌ Patch failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
