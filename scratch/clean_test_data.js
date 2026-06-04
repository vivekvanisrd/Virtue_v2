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
        console.log("=== DB CLEANUP: START ===");
        
        // Fetch all student IDs
        const students = await prisma.student.findMany({
            select: { id: true, firstName: true }
        });
        
        const studentIds = students.map(s => s.id);
        console.log(`Found ${studentIds.length} students to clean up:`, students.map(s => s.firstName));

        if (studentIds.length === 0) {
            console.log("No students found. Nothing to delete.");
            return;
        }

        // We will perform deletion in a transaction to be atomic
        await prisma.$transaction(async (tx) => {
            // 1. Delete grandchild relations first to avoid foreign key constraints
            console.log("Deleting grandchild records (allocations, items, components, discounts)...");
            
            await tx.collectionAllocation.deleteMany({
                where: {
                    collection: {
                        studentId: { in: studentIds }
                    }
                }
            });

            await tx.feeInvoiceItem.deleteMany({
                where: {
                    invoice: {
                        studentId: { in: studentIds }
                    }
                }
            });

            await tx.studentFeeComponent.deleteMany({
                where: {
                    financialRecord: {
                        studentId: { in: studentIds }
                    }
                }
            });

            await tx.discount.deleteMany({
                where: {
                    financialRecord: {
                        studentId: { in: studentIds }
                    }
                }
            });

            // 2. Delete child relations
            console.log("Deleting child records for all students...");
            await tx.academicHistory.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.academicRecord.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.address.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.bankDetail.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.collection.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.creditNote.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.document.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.examResult.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.familyDetail.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.feeInvoice.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.financialRecord.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.ledgerEntry.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.libraryMember.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.medicalRecord.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.previousSchool.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.studentAttendance.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.studentConsent.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.studentTransportAssignment.deleteMany({ where: { studentId: { in: studentIds } } });
            
            // Check if transportAssignment model exists and clear
            try {
                await tx.transportAssignment.deleteMany({ where: { studentId: { in: studentIds } } });
            } catch (e) {
                console.log("Note: transportAssignment table delete skipped or failed:", e.message);
            }
            
            await tx.transportDetail.deleteMany({ where: { studentId: { in: studentIds } } });
            await tx.unlockRequest.deleteMany({ where: { studentId: { in: studentIds } } });

            // Finally delete students
            const deleteResult = await tx.student.deleteMany({
                where: { id: { in: studentIds } }
            });
            
            console.log(`Deleted ${deleteResult.count} student records from database.`);
        }, {
            timeout: 30000
        });

        console.log("=== DB CLEANUP: COMPLETED SUCCESSFULLY ===");

    } catch (e) {
        console.error("❌ Cleanup failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
