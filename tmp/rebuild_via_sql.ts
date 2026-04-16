import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function rebuildViaSql() {
  console.log("🚀 Restoring Virtue V2 with Composite Semantic IDs...");

  const now = new Date().toISOString();
  
  // 🏛️ SEMANTIC ID DERIVATION
  const schoolCode = "VDS";
  const branchCode = "SRD";
  const session = "2026-27";
  const className = "G10";

  // Semantic Primary Keys
  const schId = `SCH-${schoolCode}`;
  const brnId = `${schId}-BRN-${branchCode}`;
  const yearId = `${brnId}-SES-${session}`;
  const classId = `CLS-${className}`;
  const structId = `${yearId}-${classId}-FEE`;

  try {
    // 1. Purge Old Data
    console.log("🧹 Purging Non-Semantic Data...");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "StudentFeeComponent", "FeeTemplateComponent", "FeeStructure", "FeeComponentMaster", "AcademicYear", "Branch", "School" CASCADE`);

    // 2. Insert School
    console.log(`🏫 Inserting School: ${schId}`);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "School" ("id", "name", "code", "status", "createdAt", "updatedAt")
      VALUES ('${schId}', 'Virtue Durga School', '${schoolCode}', 'Active', '${now}', '${now}')
    `);

    // 3. Insert Branch (Semantic Chain)
    console.log(`📍 Inserting Branch: ${brnId}`);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Branch" ("id", "schoolId", "name", "code", "createdAt", "updatedAt")
      VALUES ('${brnId}', '${schId}', 'SRD Branch', '${branchCode}', '${now}', '${now}')
    `);

    // 4. Insert Academic Year (Semantic Chain)
    console.log(`📅 Inserting Session: ${yearId}`);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "AcademicYear" ("id", "name", "startDate", "endDate", "schoolId", "isCurrent", "createdAt")
      VALUES ('${yearId}', '${session}', '2026-06-01', '2027-05-31', '${schId}', true, '${now}')
    `);

    // 5. Insert Class
    await prisma.$executeRawUnsafe(`INSERT INTO "Class" ("id", "name", "level") VALUES ('${classId}', 'Grade 10', 10) ON CONFLICT DO NOTHING`);

    // 6. Insert Modular Components
    const tId = `${schId}-COMP-TUI`;
    const aId = `${schId}-COMP-ADM`;

    await prisma.$executeRawUnsafe(`
        INSERT INTO "FeeComponentMaster" ("id", "schoolId", "name", "type")
        VALUES ('${tId}', '${schId}', 'Tuition Fee', 'CORE'),
               ('${aId}', '${schId}', 'Admission Fee', 'ANCILLARY')
    `);

    // 7. Insert Modular Template (THE FULL SEMANTIC CHAIN)
    console.log(`🎨 Designing Template: ${structId}`);
    await prisma.$executeRawUnsafe(`
        INSERT INTO "FeeStructure" ("id", "schoolId", "branchId", "classId", "academicYearId", "name", "totalAmount")
        VALUES ('${structId}', '${schId}', '${brnId}', '${classId}', '${yearId}', 'Grade 10 Standard', 50000)
    `);

    // 8. Insert Template Components (Hard-Linked)
    await prisma.$executeRawUnsafe(`
        INSERT INTO "FeeTemplateComponent" ("id", "schoolId", "templateId", "componentId", "amount", "scheduleType")
        VALUES ('TC-1', '${schId}', '${structId}', '${tId}', 45000, 'TERM'),
               ('TC-2', '${schId}', '${structId}', '${aId}', 5000, 'ONE_TIME')
    `);

    console.log("\n✨ REBUILD COMPLETE. IDs are now Semantic and Traceable.");

  } catch (error) {
    console.error("❌ SQL Rebuild Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

rebuildViaSql();
