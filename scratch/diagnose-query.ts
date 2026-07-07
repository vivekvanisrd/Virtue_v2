import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const studentId = "abc8d68a-541d-4c40-abf3-d7f32710ab84";
  console.log("⏱️  [DB_PROFILER] Running individual query timing tests...");

  // Query 1: Student details with relations
  const t0 = Date.now();
  await prisma.student.findFirst({
    where: { id: studentId, schoolId: "VIVES" },
    include: {
      academic: { include: { class: true } },
      financial: { 
        include: { 
          components: { include: { masterComponent: { select: { id: true, name: true, type: true, accountCode: true } } } }, 
          discounts: { include: { discountType: true } },
          feeStructure: { include: { components: { include: { masterComponent: { select: { id: true, name: true, type: true, accountCode: true } } } } } }
        } 
      }
    }
  });
  console.log(`⏱️  [DB_PROFILER] Query 1 (Student details) took ${Date.now() - t0}ms`);

  // Query 2: Ledger Entries
  const t1 = Date.now();
  const ledgers = await prisma.ledgerEntry.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`⏱️  [DB_PROFILER] Query 2 (Ledger entries - Count: ${ledgers.length}) took ${Date.now() - t1}ms`);

  // Query 3: Success Collections
  const t2 = Date.now();
  const collections = await prisma.collection.findMany({
    where: { studentId, status: "Success", isDeleted: false },
    orderBy: { paymentDate: 'desc' }
  });
  console.log(`⏱️  [DB_PROFILER] Query 3 (Collections - Count: ${collections.length}) took ${Date.now() - t2}ms`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
