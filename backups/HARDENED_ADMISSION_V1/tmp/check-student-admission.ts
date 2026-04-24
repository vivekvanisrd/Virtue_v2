import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
            { firstName: { contains: "Studen1" } },
            { lastName: { contains: "Success" } }
        ]
      },
      include: {
        collections: true,
        academic: true
      }
    });

    console.log("--- STUDENT DATA ---");
    console.log(JSON.stringify(student, null, 2));

    const collection = await prisma.collection.findFirst({
      where: { receiptNumber: "VIVA-REC-2026-01-00019" },
      include: { student: true }
    });

    console.log("--- COLLECTION DATA ---");
    console.log(JSON.stringify(collection, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
