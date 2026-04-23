import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditStudent(registrationId: string) {
  try {
    console.log(`--- Deep Audit: ${registrationId} ---`);

    // 1. Student Main Record
    const student = await prisma.student.findUnique({
      where: { registrationId },
      include: {
        academic: {
            include: {
                class: true,
                section: true,
            }
        },
        financial: {
          include: {
            components: {
                include: {
                    masterComponent: true
                }
            }
          }
        },
        family: true,
        address: true,
      }
    });

    if (!student) {
      console.log("❌ Student not found.");
      return;
    }

    console.log("✅ Student Record Found:", {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      status: student.status,
      schoolId: student.schoolId,
      branchId: student.branchId
    });

    // 2. Financial Totals
    if (student.financial) {
      console.log("✅ Financial Record Found:", {
        annualTuition: student.financial.annualTuition,
        tuitionFee: student.financial.tuitionFee,
        admissionFee: student.financial.admissionFee,
        cautionDeposit: student.financial.cautionDeposit,
        totalDiscount: student.financial.totalDiscount,
        paymentType: student.financial.paymentType
      });

      console.log("✅ Components Persisted:");
      student.financial.components.forEach((c: any) => {
        console.log(`   - ${c.masterComponent.name}: ₹${c.baseAmount} (Applicable: ${c.isApplicable})`);
      });
    } else {
      console.log("❌ Financial Record Missing!");
    }

    // 3. Ledger Entries
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { studentId: student.id }
    });
    console.log(`✅ Ledger Entries (${ledgerEntries.length} found):`);
    ledgerEntries.forEach((e: any) => {
      console.log(`   - [${e.type}] ${e.reason}: ₹${e.amount}`);
    });

    // 4. Journal Entries
    const journalEntries = await prisma.journalEntry.findMany({
      where: { 
        schoolId: student.schoolId || "",
        description: { contains: registrationId }
      },
      include: { lines: { include: { account: true } } }
    });
    
    if (journalEntries.length > 0) {
      console.log(`✅ Journal Entries Found:`);
      journalEntries.forEach((je: any) => {
        console.log(`   - ${je.entryType}: Total ₹${je.totalDebit} | Desc: ${je.description}`);
        je.lines.forEach((l: any) => {
            console.log(`     - [${l.debit > 0 ? 'DEBIT' : 'CREDIT'}] ${l.account.accountName} (${l.account.accountCode}): ₹${l.debit || l.credit}`);
        });
      });
    } else {
      console.log("❌ No Journal Accrual Found!");
    }

    // 5. Collection Check (Should be 0 as per user)
    const collections = await prisma.collection.findMany({
        where: { studentId: student.id }
    });
    console.log(`✅ Collections Found: ${collections.length} (Total Paid: ₹${collections.reduce((sum: number, c: any) => sum + Number(c.amountPaid), 0)})`);

  } catch (error) {
    console.error("Audit Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

auditStudent('VIVES-RCB-2026-27-PROV-00005');
