
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllBranches() {
  console.log("Checking all branches across all schools...");

  try {
    const branches = await prisma.branch.findMany({
      include: {
        school: true
      }
    });

    console.table(branches.map(b => ({
      School: b.school.code,
      BranchName: b.name,
      BranchCode: b.code,
      BranchID: b.id
    })));
  } catch (error) {
    console.error('Error fetching branches:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllBranches();
