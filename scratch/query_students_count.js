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
        const studentCount = await prisma.student.count();
        console.log(`Total students in DB: ${studentCount}`);

        const activeStudents = await prisma.student.count({
            where: { status: "Active" }
        });
        console.log(`Active students in DB: ${activeStudents}`);

        const academicHistoryCount = await prisma.academicHistory.count();
        console.log(`Total academic history records: ${academicHistoryCount}`);

        // Get student count by branch
        const studentsByBranch = await prisma.student.groupBy({
            by: ['branchId'],
            _count: { id: true }
        });
        console.log("Students by Branch:", studentsByBranch);

    } catch (e) {
        console.error("Query failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
