import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("\n=== STAFF DISTRIBUTION DEEP CHECK ===\n");

    const stats = await prisma.staff.groupBy({
        by: ['schoolId', 'branchId'],
        _count: { id: true },
        orderBy: { schoolId: 'asc' }
    });

    console.log("STAFF DATA PER BRANCH:");
    console.table(stats.map(s => ({
        School: s.schoolId,
        Branch: s.branchId,
        Count: s._count.id
    })));

    // Check if any staff have NULL branchId
    const nullBranches = await prisma.staff.count({
        where: { branchId: null }
    });
    console.log(`\nSTAFF WITH NULL BRANCH: ${nullBranches}`);

    console.log("\n=== CHECK COMPLETE ===\n");
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
