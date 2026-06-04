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
        const students = await prisma.student.findMany({
            include: {
                family: true,
                academic: true
            }
        });

        console.log(`Total students: ${students.length}`);
        console.table(students.map(s => ({
            id: s.id,
            admissionNumber: s.admissionNumber,
            name: `${s.firstName} ${s.lastName || ''}`,
            phone: s.phone,
            status: s.status,
            classId: s.academic?.classId,
            father: s.family?.fatherName,
            mother: s.family?.motherName
        })));

    } catch (e) {
        console.error("Query failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
