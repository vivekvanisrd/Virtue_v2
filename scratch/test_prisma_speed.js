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
        console.log("Starting latency tests...");
        
        let start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        console.log(`Simple query SELECT 1: ${Date.now() - start}ms`);

        start = Date.now();
        const student = await prisma.student.create({
            data: {
                firstName: "SpeedTest",
                lastName: "Temp",
                admissionNumber: "TEST-SPEED-123",
                status: "Active"
            }
        });
        console.log(`Student.create: ${Date.now() - start}ms`);

        start = Date.now();
        await prisma.student.delete({
            where: { id: student.id }
        });
        console.log(`Student.delete: ${Date.now() - start}ms`);

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
