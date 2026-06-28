const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectDb() {
  try {
    const studentCount = await prisma.student.count();
    console.log(`Total students in Database: ${studentCount}`);

    const sampleStudents = await prisma.student.findMany({
      take: 10,
      select: {
        id: true,
        studentCode: true,
        admissionNumber: true,
        registrationId: true,
        firstName: true,
        lastName: true,
        branchId: true,
        schoolId: true
      }
    });
    console.log("Sample Students in Database (First 10):");
    console.log(JSON.stringify(sampleStudents, null, 2));

    const collectionsCount = await prisma.collection.count();
    console.log(`Total collections in Database: ${collectionsCount}`);

    const sampleCollections = await prisma.collection.findMany({
      take: 5,
      select: {
        id: true,
        receiptNumber: true,
        studentId: true,
        amountPaid: true,
        paymentMode: true,
        paymentDate: true
      }
    });
    console.log("Sample Collections in Database (First 5):");
    console.log(JSON.stringify(sampleCollections, null, 2));
  } catch (error) {
    console.error("Error inspecting database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDb();
