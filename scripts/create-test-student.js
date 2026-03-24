const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const schoolId = 'AGRL-01';
    const classId = '10';
    const academicYearId = 'AGRL-01-AY-2026-27';

    // 1. Create Student
    const student = await prisma.student.create({
        data: {
            firstName: 'Gravity',
            lastName: 'Junior',
            admissionId: 'ADM-TEST-001',
            schoolId: schoolId,
            status: 'Active',
            academic: {
                create: {
                    schoolId: schoolId,
                    branchId: 'AGRL-01-BR-001', // Standard branch ID from factory
                    academicYear: '2026-27',
                    classId: classId,
                    admissionDate: new Date()
                }
            }
        }
    });

    console.log(`✅ Test student created: ${student.firstName} ${student.lastName} (ID: ${student.id})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
