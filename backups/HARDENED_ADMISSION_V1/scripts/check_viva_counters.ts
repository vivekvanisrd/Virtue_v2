import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("\n=== TENANCY COUNTER AUDIT (VIVA) ===\n");

    const counters = await prisma.tenancyCounter.findMany({
        where: { schoolId: 'VIVA' }
    });

    console.table(counters.map(c => ({
        Type: c.type,
        Year: c.year,
        Branch: c.branchId,
        LastValue: c.lastValue
    })));

    console.log("\n=== AUDIT COMPLETE ===\n");
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
