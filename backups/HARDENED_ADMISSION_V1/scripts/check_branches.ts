import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("\n=== DATABASE BRANCH AUDIT ===\n");

    const schools = await prisma.school.findMany({
        include: {
            _count: {
                select: { branches: true, staff: true }
            }
        }
    });

    console.log("SCHOOLS FOUND:", schools.map(s => ({
        id: s.id,
        name: s.name,
        branchCount: s._count.branches,
        staffCount: s._count.staff
    })));

    const branches = await prisma.branch.findMany({
        orderBy: { schoolId: 'asc' }
    });

    console.log("\nDETAILED BRANCH LIST:");
    branches.forEach(b => {
        console.log(`[${b.schoolId}] Branch: ${b.name} (ID: ${b.id}, Code: ${b.code})`);
    });

    console.log("\n=== AUDIT COMPLETE ===\n");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
