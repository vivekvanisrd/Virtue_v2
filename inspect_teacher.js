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
        const teacher = await prisma.staff.findFirst({
            where: { username: 'teacher' }
        });
        
        console.log('Teacher User Record:', teacher);
        
        if (teacher) {
            const bcrypt = require('bcryptjs');
            const match = await bcrypt.compare('teacher123', teacher.passwordHash);
            console.log('Does password teacher123 match passwordHash?', match);
        }

        // Let's also check another active staff member to compare status values
        const activeStaff = await prisma.staff.findFirst({
            where: { status: 'ACTIVE' }
        });
        console.log('Sample ACTIVE staff status value in DB:', activeStaff ? activeStaff.status : 'None');

        const activeStaffCase = await prisma.staff.findFirst({
            where: { status: 'Active' }
        });
        console.log('Sample Active staff status value in DB:', activeStaffCase ? activeStaffCase.status : 'None');

    } catch (e) {
        console.error('Error querying DB:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
