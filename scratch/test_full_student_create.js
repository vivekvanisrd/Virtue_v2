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
        console.log("Starting full student creation speed test...");
        
        const schoolId = 'VIVES';
        const branchId = 'VIVES-RCB';
        const academicYearId = 'AY-2025-26-VIVES';
        
        // Let's resolve Nursery class
        const cls = await prisma.class.findFirst({
            where: { branchId: branchId, name: "Nursery" }
        });
        const resolvedClassId = cls ? cls.id : null;
        
        const start = Date.now();
        
        // 1. Create student
        const t1 = Date.now();
        const student = await prisma.student.create({
            data: {
                school: { connect: { id: schoolId } },
                branch: { connect: { id: branchId } },
                admissionNumber: "TEST-SPEED-999",
                firstName: "Speed",
                lastName: "Test",
                status: "Active"
            }
        });
        console.log(`- student.create: ${Date.now() - t1}ms`);

        // 2. Create academic record
        const t2 = Date.now();
        await prisma.academicRecord.create({
            data: {
                student: { connect: { id: student.id } },
                school: { connect: { id: schoolId } },
                branch: { connect: { id: branchId } },
                academicYear: academicYearId,
                class: resolvedClassId ? { connect: { id: resolvedClassId } } : undefined,
                admissionDate: new Date()
            }
        });
        console.log(`- academicRecord.create: ${Date.now() - t2}ms`);

        // 3. Create family details
        const t3 = Date.now();
        await prisma.familyDetail.create({
            data: {
                student: { connect: { id: student.id } },
                school: { connect: { id: schoolId } },
                branch: { connect: { id: branchId } },
                fatherName: "Speed Father",
                motherName: "Speed Mother"
            }
        });
        console.log(`- familyDetail.create: ${Date.now() - t3}ms`);

        // 4. Create address details
        const t4 = Date.now();
        await prisma.address.create({
            data: {
                student: { connect: { id: student.id } },
                school: { connect: { id: schoolId } },
                branch: { connect: { id: branchId } },
                currentAddress: "Test Address",
                permanentAddress: "Test Address"
            }
        });
        console.log(`- address.create: ${Date.now() - t4}ms`);

        console.log(`Total time for full student creation: ${Date.now() - start}ms`);

        // Cleanup
        console.log("Cleaning up speed test student...");
        await prisma.academicRecord.delete({ where: { studentId: student.id } });
        await prisma.familyDetail.delete({ where: { studentId: student.id } });
        await prisma.address.delete({ where: { studentId: student.id } });
        await prisma.student.delete({ where: { id: student.id } });
        console.log("Cleanup finished.");

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
