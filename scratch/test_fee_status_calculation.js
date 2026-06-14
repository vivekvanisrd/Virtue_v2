const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find a student with multiple fee components
  const students = await prisma.student.findMany({
    where: {
      financial: {
        isNot: null
      }
    },
    include: {
      financial: {
        include: {
          components: {
            include: {
              masterComponent: true
            }
          }
        }
      }
    }
  });

  // Filter students in JavaScript
  const student = students.find(s => {
    return s.financial && s.financial.components && s.financial.components.some(c => 
      !c.masterComponent.name.toLowerCase().includes('tuition')
    );
  });

  if (!student) {
    console.log('No student found with ancillary components');
    return;
  }

  console.log(`Student: ${student.firstName} ${student.lastName}`);
  console.log('--- Components in DB ---');
  student.financial.components.forEach(c => {
    console.log(`- ${c.masterComponent.name} (${c.masterComponent.type}): Base=${c.baseAmount}, Waiver=${c.waiverAmount}, Discount=${c.discountAmount}`);
  });

  // Let's call the calculation logic directly
  const components = student.financial.components;
  
  // What is the Core Tuition amount?
  const coreTuitionComponents = components.filter(c => c.masterComponent.type === 'CORE' || c.masterComponent.name.toLowerCase().includes('tuition'));
  const ancillaryComponents = components.filter(c => c.masterComponent.type !== 'CORE' && !c.masterComponent.name.toLowerCase().includes('tuition'));

  console.log('\nCORE Components:');
  coreTuitionComponents.forEach(c => console.log(`  - ${c.masterComponent.name}: ${c.baseAmount}`));

  console.log('ANCILLARY Components:');
  ancillaryComponents.forEach(c => console.log(`  - ${c.masterComponent.name}: ${c.baseAmount}`));

  const totalTuition = components.reduce((sum, c) => sum + Number(c.baseAmount || 0), 0);
  console.log('\nCalculated Tuition Sum (All Components summed in getStudentFeeStatus):', totalTuition);

  const discount = components.reduce((sum, c) => sum + Number(c.waiverAmount || 0) + Number(c.discountAmount || 0), 0);
  console.log('Calculated Discount Sum:', discount);

  const tuitionVal = totalTuition;
  const discountVal = discount;
  const t3Base = Math.round(tuitionVal * 0.25);
  const t2Base = Math.round(tuitionVal * 0.25);
  const t1Base = Math.round(tuitionVal * 0.5);

  let remainingDiscount = discountVal;
  const t3Amt = Math.max(0, t3Base - remainingDiscount);
  remainingDiscount = Math.max(0, remainingDiscount - t3Base);

  const t2Amt = Math.max(0, t2Base - remainingDiscount);
  remainingDiscount = Math.max(0, remainingDiscount - t2Base);

  const t1Amt = Math.max(0, t1Base - remainingDiscount);

  console.log('\n--- Split Installments (calculateTermBreakdown output) ---');
  console.log(`Term 1 (50%): ₹${t1Amt}`);
  console.log(`Term 2 (25%): ₹${t2Amt}`);
  console.log(`Term 3 (25%): ₹${t3Amt}`);
  console.log(`Total: ₹${t1Amt + t2Amt + t3Amt}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
