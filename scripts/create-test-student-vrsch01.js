const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const schoolId = 'VR-SCH01';
    const classId = '10';
    const branchId = 'VR-RCB01';

    // 1. Create Student
    const student = await prisma.student.create({
        data: {
            firstName: 'Legacy',
            lastName: 'Junior',
            admissionId: 'ADM-LEGACY-001',
            schoolId: schoolId,
            status: 'Active',
            academic: {
                create: {
                    schoolId: schoolId,
                    branchId: branchId,
                    academicYear: '2026-27',
                    classId: classId,
                    admissionDate: new Date()
                }
            }
        }
    });

    console.log(`✅ Test student created in VR-SCH01: ${student.firstName} ${student.lastName} (ID: ${student.id})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
