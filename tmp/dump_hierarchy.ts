
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listSchoolsAndBranches() {
  console.log("Fetching School and Branch Hierarchy...");

  try {
    const schools = await prisma.school.findMany({
      include: {
        branches: true
      }
    });

    if (schools.length === 0) {
      console.log('No schools found.');
    } else {
      for (const school of schools) {
        console.log(`\n🏫 SCHOOL: ${school.name} (ID: ${school.id}, Code: ${school.code})`);
        
        if (school.branches.length === 0) {
          console.log('   - No branches found.');
        } else {
          console.log(`\n   --- BRANCHES ---`);
          console.table(school.branches.map(b => ({
            ID: b.id,
            Name: b.name,
            Code: b.code || 'N/A',
            Status: b.isActive ? 'Active' : 'Inactive'
          })));
        }
      }
    }
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listSchoolsAndBranches();
