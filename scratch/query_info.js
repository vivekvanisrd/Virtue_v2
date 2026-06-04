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
        console.log("=== SCHOOLS ===");
        const schools = await prisma.school.findMany({
            select: { id: true, name: true, code: true }
        });
        console.table(schools);

        console.log("\n=== BRANCHES ===");
        const branches = await prisma.branch.findMany({
            select: { id: true, name: true, code: true, schoolId: true }
        });
        console.table(branches);

        console.log("\n=== ACADEMIC YEARS ===");
        const academicYears = await prisma.academicYear.findMany({
            select: { id: true, name: true, isCurrent: true }
        });
        console.table(academicYears);

        console.log("\n=== CLASSES ===");
        const classes = await prisma.class.findMany({
            select: { id: true, name: true, level: true, branchId: true }
        });
        console.table(classes.map(c => ({
            id: c.id,
            name: c.name,
            level: c.level,
            branch: branches.find(b => b.id === c.branchId)?.code || c.branchId
        })));

    } catch (e) {
        console.error("Query failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
