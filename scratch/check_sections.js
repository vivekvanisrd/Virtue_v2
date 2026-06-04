const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: "postgresql://postgres:VivekeVani%40369@db.bmyhbgwyirvjeadpvwny.supabase.co:6543/postgres?pgbouncer=true"
            }
        }
    });

    try {
        console.log("=== SECTIONS IN DATABASE ===");
        const sections = await prisma.section.findMany({
            select: { id: true, name: true, classId: true, branchId: true }
        });
        const classes = await prisma.class.findMany({
            select: { id: true, name: true }
        });

        console.table(sections.map(s => ({
            id: s.id,
            name: s.name,
            class: classes.find(c => c.id === s.classId)?.name || s.classId,
            branchId: s.branchId
        })));

    } catch (e) {
        console.error("Query failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
