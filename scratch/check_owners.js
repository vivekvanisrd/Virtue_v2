const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== SCHOOLS ===");
    const schools = await prisma.school.findMany({
        select: { id: true, name: true, code: true }
    });
    console.log(schools);

    console.log("\n=== BRANCHES ===");
    const branches = await prisma.branch.findMany({
        select: { id: true, schoolId: true, name: true, code: true }
    });
    console.log(branches);

    console.log("\n=== STAFF MEMBERS ===");
    const staff = await prisma.staff.findMany({
        select: {
            id: true,
            staffCode: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            schoolId: true,
            branchId: true,
            status: true,
            onboardingStatus: true,
            username: true
        }
    });
    console.log(staff);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
