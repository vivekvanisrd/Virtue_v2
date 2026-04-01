const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepSearch() {
  const partialId = "SYHSRr4gDDOamo";
  
  console.log(`Searching for any record containing: ${partialId}...`);
  
  const results = await prisma.collection.findMany({
    where: {
      OR: [
        { paymentReference: { contains: partialId } },
        { id: { contains: partialId } }
      ]
    },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          admissionNumber: true
        }
      }
    }
  });

  if (results.length > 0) {
    console.log(`SUCCESS: Found ${results.length} record(s)!`);
    console.log(JSON.stringify(results, null, 2));
  } else {
    // Check if it's a student ID?
    const student = await prisma.student.findFirst({
        where: { id: { contains: partialId } }
    });
    if (student) {
        console.log("Found a STUDENT matching this partial ID, but no collection recorded for them.");
        console.log(JSON.stringify(student, null, 2));
    } else {
        console.log("NOT FOUND: No collection or student matches this ID.");
    }
  }
}

deepSearch()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
