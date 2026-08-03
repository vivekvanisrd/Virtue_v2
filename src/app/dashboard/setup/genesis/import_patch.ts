/**
 * import_patch.ts  (v2 — fast batch edition)
 *
 * Fixes the 3 MEDIUM gaps from import_integrity_audit.ts:
 *
 * PATCH 1 (AUTO): Assign Section "A" to all AcademicRecord + StudentAcademicYear
 *                 rows that have sectionId: null.
 *   Strategy:
 *   - Phase 1: For every class that has unsectioned students, ensure a Section "A" exists.
 *   - Phase 2: Batch-update AcademicRecord and StudentAcademicYear using updateMany per class.
 *
 * REPORT 2 (MANUAL): List students with no DOB.
 * REPORT 3 (INFO):   Count placeholder addresses.
 *
 * Run: npx tsx src/app/dashboard/setup/genesis/import_patch.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runPatch() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔧 VIRTUE V2 — IMPORT AUTO-PATCH v2");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH 1 — Phase 1: Collect all distinct classId values that need sections
  // ─────────────────────────────────────────────────────────────────────────
  console.log("🔧 [PATCH 1 / Phase 1] Discovering classes with unsectioned records...");

  const unsectionedRecords = await prisma.academicRecord.findMany({
    where: { sectionId: null },
    select: { classId: true, schoolId: true, branchId: true }
  });

  if (unsectionedRecords.length === 0) {
    console.log("   ✅ No unsectioned records found — nothing to patch.\n");
  } else {
    console.log(`   Found ${unsectionedRecords.length} unsectioned AcademicRecord rows.`);

    // Build unique class + school combos
    const classMap = new Map<string, { classId: string; schoolId: string; branchId: string | null }>();
    for (const r of unsectionedRecords) {
      if (!classMap.has(r.classId)) {
        classMap.set(r.classId, { classId: r.classId, schoolId: r.schoolId, branchId: r.branchId });
      }
    }

    console.log(`   Unique classes needing sections: ${classMap.size}`);

    // Phase 1a: For each class, ensure Section "A" exists (upsert)
    const sectionMap = new Map<string, string>(); // classId → sectionId

    for (const { classId, schoolId, branchId } of classMap.values()) {
      // Try to find any existing section for this class
      let section = await prisma.section.findFirst({
        where: { classId, schoolId },
        orderBy: { name: "asc" }
      });

      if (!section) {
        const classInfo = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } });
        section = await prisma.section.create({
          data: {
            classId,
            name: "A",
            capacity: 40,
            schoolId,
            branchId: branchId ?? undefined
          }
        });
        console.log(`   ✨ Created Section A for class "${classInfo?.name ?? classId}"`);
      }

      sectionMap.set(classId, section.id);
    }

    // Phase 1b: Batch-update AcademicRecord rows by class
    console.log("\n🔧 [PATCH 1 / Phase 2] Batch-assigning sections to AcademicRecord rows...");
    let totalUpdated = 0;

    for (const [classId, sectionId] of sectionMap.entries()) {
      const result = await prisma.academicRecord.updateMany({
        where: { classId, sectionId: null },
        data: { sectionId }
      });
      totalUpdated += result.count;
    }
    console.log(`   ✅ AcademicRecord rows updated: ${totalUpdated}`);

    // Phase 1c: Batch-update StudentAcademicYear rows by class
    console.log("\n🔧 [PATCH 1 / Phase 3] Batch-assigning sections to StudentAcademicYear rows...");
    let ayUpdated = 0;

    for (const [classId, sectionId] of sectionMap.entries()) {
      const result = await prisma.studentAcademicYear.updateMany({
        where: { classId, sectionId: null },
        data: { sectionId }
      });
      ayUpdated += result.count;
    }
    console.log(`   ✅ StudentAcademicYear rows updated: ${ayUpdated}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REPORT 2: Students with no DOB
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n📋 [REPORT 2] Students with no Date of Birth:");
  const noDob = await prisma.student.findMany({
    where: { dob: null, status: { in: ["Active", "ACTIVE"] } },
    select: { studentCode: true, firstName: true, lastName: true },
    orderBy: { studentCode: "asc" }
  });

  if (noDob.length === 0) {
    console.log("   ✅ All students have DOB.");
  } else {
    console.log(`   ⚠️  ${noDob.length} students are missing DOB (manual collection required):`);
    noDob.slice(0, 20).forEach((s) =>
      console.log(`   → ${s.studentCode}: ${s.firstName} ${s.lastName || ""}`)
    );
    if (noDob.length > 20) console.log(`   ... and ${noDob.length - 20} more`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REPORT 3: Placeholder addresses
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n📋 [REPORT 3] Placeholder Address Status:");
  const placeholderCount = await prisma.address.count({
    where: { currentAddress: { contains: "VIVES Campus Student Address" } }
  });
  console.log(placeholderCount > 0
    ? `   ℹ️  ${placeholderCount} students still have default import address (parents will update via portal).`
    : "   ✅ No placeholder addresses found."
  );

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Patch Complete.");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

runPatch()
  .catch((e) => {
    console.error("❌ Patch failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
