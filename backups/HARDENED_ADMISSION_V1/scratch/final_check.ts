import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function finalCheck() {
  const lines = await prisma.journalLine.findMany({
    where: { journalEntryId: '41aec47b-d769-4ec3-a744-49001b807c85' }
  });
  console.log("Journal Lines:", lines.map(l => ({
    debit: l.debit.toString(),
    credit: l.credit.toString()
  })));
}

finalCheck();
