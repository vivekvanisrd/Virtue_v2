import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Please provide an email');
    return;
  }

  const staff = await prisma.staff.findMany({
    where: { email },
    include: { school: true, branch: true }
  });

  const enquiries = await prisma.enquiry.findMany({
    where: { parentEmail: email }
  });

  console.log('--- Staff with email ---');
  staff.forEach(s => console.log(`Staff ID: ${s.id}, Name: ${s.firstName} ${s.lastName}, School: ${s.schoolId}, Branch: ${s.branchId}`));

  console.log('--- Enquiries with email ---');
  enquiries.forEach(e => console.log(`Enquiry ID: ${e.id}, Student: ${e.studentFirstName}, School: ${e.schoolId}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
