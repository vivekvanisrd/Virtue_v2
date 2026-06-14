const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const students = await prisma.student.findMany({
      include: {
        academic: { include: { class: true } },
        financial: true,
        collections: true
      }
    });
    
    console.log(`Found ${students.length} students:`);
    for (const s of students) {
      console.log(`Student ID: ${s.id}`);
      console.log(`Name: ${s.firstName} ${s.lastName}`);
      console.log(`Status: ${s.status} | Code: ${s.studentCode} | AdmNo: ${s.admissionNumber}`);
      console.log(`Financial: tuition=${s.financial?.tuitionFee}, annual=${s.financial?.annualTuition}, plan=${s.financial?.paymentType}`);
      console.log(`Created At: ${s.createdAt}`);
      console.log("---------------------------------------");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
