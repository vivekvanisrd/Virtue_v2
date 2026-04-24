import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Simple UUID generator fallback
const rand = () => Math.random().toString(36).substring(2, 7);

async function rebuildVirtueFinance() {
  console.log("🚀 Restoring Virtue V2 with Absolute Tenancy Integrity...");

  const now = new Date();

  try {
    // 1. Create Root School
    const schoolId = "sch-" + rand();
    const school = await prisma.school.create({
      data: { 
        id: schoolId,
        name: "Virtue Durga School",
        code: "VDS-" + rand(), 
        address: "Virtue Campus, SRD",
        email: "admin@virtue.edu",
        status: "Active",
        createdAt: now,
        updatedAt: now
      }
    });
    console.log(`✅ School Root Created: [${school.id}]`);

    // 2. Create Branch
    const branchId = "brn-" + rand();
    const branch = await prisma.branch.create({
      data: { 
        id: branchId, 
        name: "SRD Branch", 
        code: "SRD-" + rand(),
        location: "North Wing", 
        schoolId: school.id,
        createdAt: now,
        updatedAt: now
      }
    });
    console.log(`✅ Branch Created: [${branch.id}]`);

    // 3. Create Session 2026-27
    const yearId = "yr-" + rand();
    const year = await prisma.academicYear.create({
      data: { 
        id: yearId,
        name: "2026-27", 
        startDate: new Date("2026-06-01"), 
        endDate: new Date("2027-05-31"), 
        schoolId: school.id, 
        isCurrent: true,
        createdAt: now,
        updatedAt: now
      }
    });
    console.log(`✅ Academic Year Created: [${year.id}]`);

    // 4. Create Grade 10
    const classId = "cls-" + rand();
    const gradeClass = await prisma.class.create({
      data: { 
        id: classId, 
        name: "Grade 10", 
        level: 10,
        createdAt: now,
        updatedAt: now
      }
    });
    console.log(`✅ Class Created: [${gradeClass.id}]`);

    // 5. Seed 'Controlled Engine' Master Components
    console.log("📦 Initializing Modular Component Master...");
    const tuition = await prisma.feeComponentMaster.create({
        data: { schoolId: school.id, name: "Tuition Fee", type: "CORE" }
    });
    const admission = await prisma.feeComponentMaster.create({
        data: { schoolId: school.id, name: "Admission Fee", type: "ANCILLARY", isOneTime: true }
    });
    const sports = await prisma.feeComponentMaster.create({
        data: { schoolId: school.id, name: "Sports & Lab Fee", type: "ANCILLARY" }
    });

    // 6. Create Modular Template (Class 10 2026)
    console.log("🎨 Designing Modular Template for Grade 10...");
    const template = await prisma.feeStructure.create({
      data: {
        id: "struct-" + rand(),
        schoolId: school.id,
        branchId: branch.id,
        classId: gradeClass.id,
        academicYearId: year.id,
        name: "Grade 10 - Standard 2026",
        totalAmount: 55000,
        createdAt: now,
        updatedAt: now
      }
    });

    // 🏛️ EXPLICIT TENANCY ASSEMBLY
    await prisma.feeTemplateComponent.createMany({
        data: [
          { id: "tc-" + rand(), schoolId: school.id, templateId: template.id, componentId: tuition.id, amount: 45000, scheduleType: "TERM" },
          { id: "tc-" + rand(), schoolId: school.id, templateId: template.id, componentId: admission.id, amount: 5000, scheduleType: "ONE_TIME" },
          { id: "tc-" + rand(), schoolId: school.id, templateId: template.id, componentId: sports.id, amount: 5000, scheduleType: "TERM" }
        ]
    });

    console.log("\n✨ REBUILD COMPLETE. Absolute Tenancy is Enforced on all junctions.");

  } catch (error) {
    console.error("❌ Rebuild Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

rebuildVirtueFinance();
