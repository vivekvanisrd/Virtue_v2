import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function patchStudentJournal(registrationId: string) {
  try {
    console.log(`--- Forensic Patch for ${registrationId} ---`);

    const student = await prisma.student.findUnique({
      where: { registrationId },
      include: { school: true }
    });

    if (!student) {
      console.log("❌ Student not found.");
      return;
    }

    const journalEntry = await prisma.journalEntry.findFirst({
      where: { 
        schoolId: student.schoolId!,
        description: { contains: registrationId },
        entryType: "ADMISSION_ACCRUAL"
      },
      include: { lines: true }
    });

    if (!journalEntry) {
      console.log("❌ Journal Entry not found.");
      return;
    }

    console.log(`Found Journal Entry: ${journalEntry.id}. Current Lines: ${journalEntry.lines.length}`);

    // Find Tuition Income Account (4100)
    const incomeAccount = await prisma.chartOfAccount.findFirst({
        where: { accountCode: '4100', schoolId: student.schoolId! }
    });

    if (!incomeAccount) {
        console.log("❌ Income Account (4100) not found.");
        return;
    }

    // Check if credit line already exists
    const creditExists = journalEntry.lines.some(l => l.credit > 0);
    if (creditExists) {
        console.log("⚠️ Credit line already exists. No patch needed.");
        return;
    }

    // Perform the patch
    await prisma.journalLine.create({
        data: {
            journalEntryId: journalEntry.id,
            accountId: incomeAccount.id,
            debit: 0,
            credit: 46000,
            description: "Accrual: Tuition Fee (Forensic Patch)"
        }
    });

    console.log("✅ Missing Credit line added successfully.");

  } catch (error) {
    console.error("Patch Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

patchStudentJournal('VIVES-RCB-2026-27-PROV-00005');
