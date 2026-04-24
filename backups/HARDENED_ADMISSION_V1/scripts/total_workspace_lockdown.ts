import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function lockdown() {
    console.log("🚀 Starting Resurrection Lockdown (V2.3)...");

    // 1. Resolve Context
    const schoolId = 'VIVA';
    const branches = await prisma.branch.findMany({ where: { schoolId } });
    const rcb = branches.find(b => b.code === 'RCB');
    const mainBranch = branches.find(b => b.code === 'MAIN' || b.code === 'VIVA-BR-01' || b.name.includes('Main'));
    
    const academicYear = await prisma.academicYear.findFirst({
        where: { schoolId },
        orderBy: { startDate: 'desc' }
    });

    const defaultClass = await prisma.class.findFirst();

    if (!rcb || !mainBranch || !academicYear || !defaultClass) {
        console.error("❌ Critical context missing!");
        return;
    }

    console.log(`📍 Origin: ${rcb.code} | Target: ${mainBranch.code}`);
    console.log(`📅 Year: ${academicYear.name} | 🏫 Default Class: ${defaultClass.id}`);

    // 2. Backfill Existing Students to RCB
    await prisma.student.updateMany({
        where: { branchId: null, schoolId },
        data: { branchId: rcb.id }
    });

    // 3. Mirror Students (RCB -> MAIN)
    console.log("👥  Mirroring Students...");
    const rcbStudents = await prisma.student.findMany({
        where: { branchId: rcb.id },
        include: { academic: true, history: true }
    });

    let mirroredCount = 0;
    let errorCount = 0;

    for (const s of rcbStudents) {
        const student = s as any;

        const existsInMain = await prisma.student.findFirst({
            where: {
                firstName: student.firstName,
                lastName: student.lastName,
                branchId: mainBranch.id
            }
        });
        if (existsInMain) continue;

        const newStudentCode = student.studentCode?.replace('-RCB-', '-MAIN-') || null;
        const { id, createdAt, updatedAt, history, academic, school, branch, ...studentBase } = student;

        try {
            await prisma.$transaction(async (tx) => {
                await tx.student.create({
                    data: {
                        ...studentBase,
                        studentCode: newStudentCode,
                        registrationId: student.registrationId ? `${student.registrationId}_MAIN` : null,
                        admissionNumber: student.admissionNumber ? `${student.admissionNumber}_MAIN` : null,
                        schoolId,
                        branchId: mainBranch.id,
                        history: {
                            create: {
                                id: `HIST_${id}_MAIN`.substring(0, 30),
                                academicYearId: academicYear.id,
                                branchId: mainBranch.id,
                                classId: history[0]?.classId || defaultClass.id,
                                sectionId: history[0]?.sectionId,
                                promotionStatus: 'Active',
                                schoolId,
                            }
                        },
                        academic: academic ? {
                            create: {
                                id: `ACAD_${id}_MAIN`.substring(0, 30),
                                academicYear: academicYear.name,
                                branchId: mainBranch.id,
                                classId: academic.classId || defaultClass.id,
                                schoolId
                            }
                        } : undefined
                    }
                });
            });
            mirroredCount++;
        } catch (e) {
            errorCount++;
            if (errorCount < 5) console.error(`   ⚠️ Failed to mirror ${student.firstName}: ${e.message}`);
        }

        if (mirroredCount % 100 === 0) console.log(`   ⏳ Mirrored ${mirroredCount}...`);
    }

    console.log(`✅ Lockdown & Sync Complete!`);
    console.log(`📊 MIRRORED: ${mirroredCount} | ERRORS: ${errorCount}`);
    console.log(`📊 TOTAL MAIN: ${await prisma.student.count({ where: { branchId: mainBranch.id } })}`);
}

lockdown()
    .catch(e => console.error("❌ Fatal Error:", e))
    .finally(() => prisma.$disconnect());
