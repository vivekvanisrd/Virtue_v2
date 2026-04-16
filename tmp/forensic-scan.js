
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
    console.log("🔍 [FORENSIC_AUDIT] Starting Deep-Scan for 'VIVES' identifier...");
    
    try {
        const school = await prisma.school.findUnique({ where: { id: 'VIVES' } });
        console.log("1. SCHOOL_ENTRY:", school || "NOT_FOUND");

        const staff = await prisma.staff.findMany({
            where: {
                OR: [
                    { id: { contains: 'VIVES' } },
                    { email: 'virtuehighsrd@gmail.com' },
                    { username: 'owner_vives' }
                ]
            }
        });
        console.log("2. CONFLICTING_STAFF:", staff.length > 0 ? staff.map(s => ({ id: s.id, email: s.email, username: s.username })) : "NONE");

        const branches = await prisma.branch.findMany({
            where: { id: { contains: 'VIVES' } }
        });
        console.log("3. CONFLICTING_BRANCHES:", branches.length > 0 ? branches.map(b => b.id) : "NONE");

    } catch (e) {
        console.error("❌ [FORENSIC_AUDIT] SCAN_FAILURE:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

diagnose();
