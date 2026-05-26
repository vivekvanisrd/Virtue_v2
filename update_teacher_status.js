const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:VivekeVani%40369@db.bmyhbgwyirvjeadpvwny.supabase.co:5432/postgres"
        }
    }
});

async function main() {
    try {
        const res = await prisma.staff.updateMany({
            where: { username: 'teacher' },
            data: { status: 'ACTIVE' }
        });
        console.log('Teacher status updated to ACTIVE. Count:', res.count);
    } catch (e) {
        console.error('Error updating status:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
