import prisma from "../src/lib/prisma";

async function check() {
    const ay = await prisma.academicYear.findMany({
        where: { schoolId: 'VIVES' }
    });
    console.log('--- ACADEMIC YEARS for VIVES ---');
    console.log(JSON.stringify(ay, null, 2));
    
    const cls = await prisma.class.findMany({
        where: { source: 'STANDARD_K10_V1' }
    });
    console.log('--- CLASSES for VIVES (by source) ---');
    console.log(cls.length);

    await prisma.$disconnect();
}

check();
