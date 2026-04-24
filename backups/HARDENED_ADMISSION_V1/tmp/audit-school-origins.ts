import prisma from "../src/lib/prisma";

/**
 * 🕵️ FORENSIC INSTANCE AUDIT
 * Detect the origin of VIVES and PROBE schools.
 */
async function auditOrigins() {
    console.log("🕵️ INITIATING FORENSIC INSTANCE AUDIT...");
    
    const schools = await prisma.school.findMany({
        where: { id: { in: ['VIVES', 'PROBE'] } },
        select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            isGenesis: true,
            metadata: true
        }
    });

    console.log("📊 RESULTS:");
    console.table(schools.map(s => ({
        ID: s.id,
        Name: s.name,
        Created: s.createdAt.toISOString(),
        Genesis: s.isGenesis,
        Status: s.status,
        Metadata: JSON.stringify(s.metadata)
    })));

    await prisma.$disconnect();
}

auditOrigins();
