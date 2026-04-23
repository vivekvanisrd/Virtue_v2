import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditStudent(registrationId: string) {
  try {
    console.log(`--- Deep Audit: ${registrationId} ---`);

    const student = await prisma.student.findUnique({
      where: { registrationId },
      include: {
        financial: {
          include: {
            components: { include: { masterComponent: true } }
          }
        }
      }
    });

    if (!student) return;

    // Journal Entry Check
    const journalEntries = await prisma.journalEntry.findMany({
      where: { 
        schoolId: student.schoolId || "",
        description: { contains: registrationId }
      },
      include: { 
        lines: { 
            include: { account: true } 
        } 
      }
    });
    
    console.log(`\n--- Journal Entry Detail ---`);
    if (journalEntries.length > 0) {
      for (const je of journalEntries) {
        console.log(`ID: ${je.id}`);
        console.log(`Type: ${je.entryType}`);
        console.log(`Total Debit: ${je.totalDebit} | Total Credit: ${je.totalCredit}`);
        console.log(`Lines Count: ${je.lines.length}`);
        je.lines.forEach((l: any, i: number) => {
            console.log(`  Line ${i+1}: [${l.debit > 0 ? 'DR' : 'CR'}] ${l.account?.accountName || 'UNKNOWN'} (${l.account?.accountCode || '???'}) - ₹${l.debit || l.credit}`);
        });
      }
    } else {
      console.log("❌ No Journal Entry found.");
    }

    // Chart of Accounts check for 1200 and 3001
    const accounts = await prisma.chartOfAccount.findMany({
        where: { 
            schoolId: student.schoolId || "",
            accountCode: { in: ['1200', '3001', '3002', '4100', '4108'] }
        }
    });
    console.log(`\n--- COA Check ---`);
    accounts.forEach(a => {
        console.log(` - ${a.accountCode}: ${a.accountName} (Balance: ${a.currentBalance})`);
    });

  } catch (error) {
    console.error("Audit Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

auditStudent('VIVES-RCB-2026-27-PROV-00005');
