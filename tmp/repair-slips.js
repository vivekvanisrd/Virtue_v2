const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- REPAIRING ALL 2026 SALARY SLIPS ---");

  // Find all runs in 2026
  const runs = await prisma.payrollRun.findMany({
    where: { 
        year: 2026,
        status: { in: ["Approved", "Paid"] } 
    },
    include: {
        slips: {
            include: {
                staff: {
                    include: { professional: true }
                }
            }
        }
    }
  });

  console.log(`Found ${runs.length} runs to check.`);

  let repairedCount = 0;
  for (const run of runs) {
    console.log(`Checking Run: ${run.month}/${run.year}...`);
    
    for (const slip of run.slips) {
      const prof = slip.staff?.professional;
      const currentSnapshot = slip.snapshot || {};
      
      // If we have professional data but the snapshot is empty/incomplete
      if (prof && (!currentSnapshot.basic || Number(currentSnapshot.basic) === 0)) {
          const basic = Number(prof.basicSalary);
          const hra = Number(prof.hraAmount) || 0;
          
          if (basic > 0) {
              console.log(`  Repairing ${slip.staff.firstName} ${slip.staff.lastName} in ${run.month}/${run.year}...`);
              
              const totalPotential = basic + hra;
              const attendedDays = Number(slip.attendedDays) || 30;
              const netSalary = Math.round((totalPotential / 30) * attendedDays);

              await prisma.salarySlip.update({
                  where: { id: slip.id },
                  data: {
                      snapshot: {
                          basic,
                          hra,
                          designation: prof.designation || "Staff"
                      },
                      netSalary: netSalary
                  }
              });
              repairedCount++;
          }
      }
    }
  }

  console.log(`--- REPAIR COMPLETE: ${repairedCount} slips updated. ---`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
