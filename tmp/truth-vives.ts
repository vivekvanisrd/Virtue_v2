import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findTheTruth() {
    console.log("🕵️ SOVEREIGN TRUTH AUDIT: VIVES\n");

    const ayCount = await prisma.academicYear.count({ where: { schoolId: 'VIVES' } });
    const classCount = await prisma.class.count({ where: { source: { contains: 'V1' } } });
    const feeCount = await prisma.feeComponentMaster.count({ where: { schoolId: 'VIVES' } });
    const studentCount = await prisma.student.count({ where: { schoolId: 'VIVES' } });

    console.log(`- Academic Years: ${ayCount}`);
    console.log(`- Classes (V1):   ${classCount}`);
    console.log(`- Fee Masters:    ${feeCount}`);
    console.log(`- Students:       ${studentCount}`);

    if (ayCount > 0) {
        const ay = await prisma.academicYear.findFirst({ where: { schoolId: 'VIVES' } });
        console.log("\nFound Institutional Anchor:");
        console.log(JSON.stringify(ay, null, 2));
    }

    await prisma.$disconnect();
}

findTheTruth();
