const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPayment() {
  const transactionId = "SYHSRr4gDDOamo"; // The ID provided by the user
  
  console.log(`Searching for Transaction ID: ${transactionId}...`);
  
  const collection = await prisma.collection.findFirst({
    where: {
      OR: [
        { paymentReference: transactionId },
        { id: transactionId } // In case it's a UUID
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

  if (collection) {
    console.log("SUCCESS: Transaction Found!");
    console.log(JSON.stringify(collection, null, 2));
  } else {
    console.log("NOT FOUND: This transaction is NOT in the database.");
  }
}

checkPayment()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
