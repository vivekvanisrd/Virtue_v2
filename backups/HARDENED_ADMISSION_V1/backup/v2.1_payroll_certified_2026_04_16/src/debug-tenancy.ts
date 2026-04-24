import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- DEBUG: STAFF TENANCY AUDIT ---');
    const staff = await prisma.staff.findMany({
        where: {
            OR: [
                { username: { contains: 'vibhushree', mode: 'insensitive' } },
                { username: { contains: 'virtuetest', mode: 'insensitive' } },
                { email: { contains: 'vibhushree', mode: 'insensitive' } },
                { email: { contains: 'virtuetest', mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            username: true,
            email: true,
            schoolId: true,
            branchId: true,
            role: true
        }
    });

    console.log('Result:', JSON.stringify(staff, null, 2));

    if (staff.length > 0) {
        const firstStaff = staff[0];
        console.log(`\n--- DEBUG: DATA CREATED BY ${firstStaff.username} ---`);
        // Check for students or other entities
        const students = await prisma.student.count({
            where: { schoolId: firstStaff.schoolId }
        });
        console.log(`Total students in School ${firstStaff.schoolId}: ${students}`);

        const branchStudents = await prisma.student.count({
            where: { 
                schoolId: firstStaff.schoolId,
                academic: { branchId: firstStaff.branchId }
            }
        });
        console.log(`Total students in Branch ${firstStaff.branchId}: ${branchStudents}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
