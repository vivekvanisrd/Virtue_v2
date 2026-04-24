const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log("🚀 Starting ERP Data Migration...");

    // 1. Migrate Student IDs -> AcademicHistory
    const students = await prisma.student.findMany({
      where: {
        OR: [
          { admissionNumber: { not: null } },
          { studentCode: { not: null } }
        ]
      },
      include: {
        history: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    console.log(`📦 Found ${students.length} students with IDs to migrate.`);

    for (const student of students) {
      if (student.history && student.history.length > 0) {
        const historyId = student.history[0].id;
        await prisma.academicHistory.update({
          where: { id: historyId },
          data: {
            admissionNumber: student.admissionNumber,
            studentCode: student.studentCode
          }
        });
        console.log(`✅ Migrated IDs for student ${student.firstName} ${student.lastName} -> History ${historyId}`);
      } else {
        console.warn(`⚠️ Student ${student.firstName} has IDs but no AcademicHistory record. Skipping.`);
      }
    }

    // 2. Link Collections -> AcademicHistory
    const collections = await prisma.collection.findMany({
        where: { admissionId: null }
    });

    console.log(`📦 Found ${collections.length} collections to link to admissions.`);

    for (const col of collections) {
        // Find history for this student in this school
        const history = await prisma.academicHistory.findFirst({
            where: { 
                studentId: col.studentId,
                schoolId: col.schoolId
            },
            orderBy: { createdAt: 'desc' } // Link to latest or relevant one
        });

        if (history) {
            await prisma.collection.update({
                where: { id: col.id },
                data: { admissionId: history.id }
            });
            console.log(`🔗 Linked Receipt ${col.receiptNumber} -> Admission ${history.id}`);
        } else {
            console.warn(`⚠️ Collection ${col.receiptNumber} has no matching admission record. Skipping.`);
        }
    }

    console.log("🏁 Migration Complete!");

  } catch (e) {
    console.error("❌ Migration Failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
