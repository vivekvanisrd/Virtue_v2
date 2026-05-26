const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:VivekeVani%40369@db.bmyhbgwyirvjeadpvwny.supabase.co:5432/postgres"
        }
    }
});

async function main() {
    try {
        // Find a staff member (like the principal) to copy schoolId and branchId
        const principal = await prisma.staff.findFirst({
            where: { role: 'PRINCIPAL' }
        });

        if (!principal) {
            console.error('No PRINCIPAL found to copy branch/school context from.');
            return;
        }

        const username = 'teacher';
        const password = 'teacher123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if teacher user already exists
        const existing = await prisma.staff.findFirst({
            where: { username }
        });

        if (existing) {
            await prisma.staff.update({
                where: { id: existing.id },
                data: {
                    passwordHash: hashedPassword,
                    role: 'Teacher',
                    status: 'Active',
                    onboardingStatus: 'COMPLETED'
                }
            });
            console.log(`Updated existing user '${username}' in Staff table.`);
        } else {
            const newStaff = await prisma.staff.create({
                data: {
                    staffCode: 'T001',
                    firstName: 'Teacher',
                    lastName: 'Portal',
                    email: 'teacher@virtue.pava.com',
                    phone: '9999999999',
                    role: 'Teacher',
                    username: username,
                    passwordHash: hashedPassword,
                    schoolId: principal.schoolId,
                    branchId: principal.branchId,
                    status: 'Active',
                    onboardingStatus: 'COMPLETED'
                }
            });
            console.log(`Created new Teacher user:`, newStaff);
        }
    } catch (err) {
        console.error('Error creating teacher user:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
