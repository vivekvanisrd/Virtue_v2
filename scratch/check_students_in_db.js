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
        console.log(`Total students in DB (count): ${studentCount}`);

        const students = await prisma.student.findMany({
            select: {
                id: true,
                admissionNumber: true,
                firstName: true,
                lastName: true,
                status: true,
                isDeleted: true
            },
            take: 20
        });
        console.log("First 20 students in DB:");
        console.table(students);

    } catch (e) {
        console.error("Query failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
