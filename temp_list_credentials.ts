import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const staffList = await prisma.staff.findMany({
    include: {
      branch: true
    },
    orderBy: {
      firstName: 'asc'
    }
  });

  let output = `| Name | Role | Email | Phone (Works as Password & Username) | System Username | Fallback Password |\n`;
  output += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const staff of staffList) {
    const hasPhone = staff.phone && staff.phone.trim().length > 0;
    const cleanPhone = hasPhone ? staff.phone.trim() : '';
    const username = staff.username || '';
    const email = staff.email || '';
    const name = `${staff.firstName} ${staff.lastName || ''}`.trim();
    
    // Default password logic: phone number if available, otherwise default branch password
    const password = cleanPhone || `Virtue@${staff.branch.code}2026`;
    const fallbackPasswordLabel = cleanPhone ? 'Phone Number' : `Virtue@${staff.branch.code}2026`;

    output += `| ${name} | ${staff.role} | ${email || '*None*'} | ${cleanPhone || '*None*'} | ${username || '*None*'} | \`${password}\` |\n`;
  }

  fs.writeFileSync('temp_credentials_list.md', output);
  console.log("SUCCESS: Exported credentials to temp_credentials_list.md");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
