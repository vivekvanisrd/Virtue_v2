import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const schoolId = "VIVES";
  const branchFilter = {};
  const activeAY = "RCB-AY24"; // Mock active AY

  console.log("⏱️  [DB_PROFILER] Diagnosing dashboard stats queries...");

  const t0 = Date.now();
  await prisma.student.count({
    where: { schoolId, status: "CONFIRMED", ...branchFilter }
  });
  console.log(`⏱️  [DB_PROFILER] Query 1 (Student count) took ${Date.now() - t0}ms`);

  const t1 = Date.now();
  await prisma.staff.count({
    where: { schoolId, role: "TEACHER", ...branchFilter, status: "ACTIVE" }
  });
  console.log(`⏱️  [DB_PROFILER] Query 2 (Teacher count) took ${Date.now() - t1}ms`);

  const t2 = Date.now();
  await prisma.studentFeeComponent.aggregate({
    where: {
      schoolId,
      isApplicable: true,
      ...branchFilter,
      financialRecord: {
        student: {
          academic: {
            academicYear: activeAY
          }
        }
      }
    },
    _sum: { baseAmount: true, waiverAmount: true, discountAmount: true }
  });
  console.log(`⏱️  [DB_PROFILER] Query 3 (Fee expectations sum) took ${Date.now() - t2}ms`);

  const t3 = Date.now();
  await prisma.collection.groupBy({
    by: ['paymentMode'],
    where: { schoolId, status: "Success", isDeleted: false, ...branchFilter },
    _sum: { amountPaid: true, totalPaid: true }
  });
  console.log(`⏱️  [DB_PROFILER] Query 4 (Collections group) took ${Date.now() - t3}ms`);

  const t4 = Date.now();
  await prisma.collection.aggregate({
    where: { 
      schoolId,
      paymentDate: { gte: new Date(new Date().setHours(0,0,0,0)) },
      status: "Success",
      isDeleted: false,
      ...branchFilter
    },
    _sum: { totalPaid: true }
  });
  console.log(`⏱️  [DB_PROFILER] Query 5 (Daily revenue) took ${Date.now() - t4}ms`);

  const t5 = Date.now();
  await prisma.collection.findMany({
    where: { schoolId, status: "Success", isDeleted: false, ...branchFilter },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: { paymentDate: "desc" },
    take: 5
  });
  console.log(`⏱️  [DB_PROFILER] Query 6 (Recent collections) took ${Date.now() - t5}ms`);

  const t6 = Date.now();
  await prisma.class.findMany({
    where: { schoolId, ...branchFilter },
    select: {
      id: true,
      name: true,
      academicRecords: {
        where: { academicYear: activeAY },
        select: {
          student: {
            select: {
              id: true,
              financial: {
                select: {
                  components: {
                    where: { isApplicable: true },
                    select: { baseAmount: true, waiverAmount: true, discountAmount: true }
                  }
                }
              },
              collections: {
                where: { status: "Success", isDeleted: false },
                select: { amountPaid: true }
              }
            }
          }
        }
      }
    }
  });
  console.log(`⏱️  [DB_PROFILER] Query 7 (Class student finances) took ${Date.now() - t6}ms`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
