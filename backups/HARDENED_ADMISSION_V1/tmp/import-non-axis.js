const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, 'source_axis_external.csv');
  if (!fs.existsSync(filePath)) {
    console.error("Source file not found: " + filePath);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Find School and Branch
  const school = await prisma.school.findFirst();
  const branch = await prisma.branch.findFirst({ where: { schoolId: school?.id, name: { contains: 'Main' } } }) || await prisma.branch.findFirst({ where: { schoolId: school?.id } });

  if (!school || !branch) {
    console.error("Missing School or Branch in database.");
    return;
  }

  console.log(`Using School: ${school.name} (${school.id})`);
  console.log(`Using Branch: ${branch.name} (${branch.id})`);

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 6) continue;

    const amount = parseFloat(parts[1]) || 0;
    const fullName = parts[3].trim().replace(/"/g, '');
    const accountNumber = parts[4].trim().replace(/"/g, '');
    const ifscCode = parts[5].trim().replace(/"/g, '');

    if (!fullName || !accountNumber) continue;

    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Staff';

    const staffCode = `EXT-${firstName.substring(0, 3).toUpperCase()}-${accountNumber.slice(-4)}`;

    console.log(`Processing: ${fullName} (${staffCode}) - ₹${amount}`);

    try {
      const staff = await prisma.staff.upsert({
        where: { branchId_staffCode: { branchId: branch.id, staffCode } },
        update: {
          firstName,
          lastName,
          status: "ACTIVE"
        },
        create: {
          staffCode,
          firstName,
          lastName,
          branchId: branch.id,
          schoolId: school.id,
          status: "ACTIVE"
        }
      });

      await prisma.staffProfessional.upsert({
        where: { staffId: staff.id },
        update: {
          basicSalary: amount,
          hraAmount: 0
        },
        create: {
          staffId: staff.id,
          designation: "Assistant", 
          dateOfJoining: new Date(),
          basicSalary: amount,
          hraAmount: 0
        }
      });

      await prisma.staffBank.upsert({
        where: { staffId: staff.id },
        update: {
          accountNumber,
          ifscCode,
          accountName: fullName,
          bankName: "Non-Axis Bank"
        },
        create: {
          staffId: staff.id,
          accountName: fullName,
          accountNumber,
          ifscCode,
          bankName: "Non-Axis Bank"
        }
      });

      count++;
    } catch (err) {
      console.error(`Error importing ${fullName}:`, err);
    }
  }

  console.log(`--- IMPORT COMPLETE: ${count} staff added/updated. ---`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
