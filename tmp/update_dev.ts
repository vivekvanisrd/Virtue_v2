import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = "pavan@virtueschool.com";
  const newUsername = "pavan@virtueschool.com";
  const newPassword = "Virtue@369";
  const passwordHash = await bcrypt.hash(newPassword, 10);

  console.log(`Updating staff record for ${email}...`);
  
  const update = await prisma.staff.updateMany({
    where: { email },
    data: {
      username: newUsername,
      passwordHash: passwordHash
    }
  });

  console.log(`Update result:`, update);

  if (update.count === 0) {
    console.log("No record found with that email. Creating new developer...");
    // If not found, create (though I saw it exists)
    await prisma.staff.create({
      data: {
        email,
        username: newUsername,
        passwordHash,
        role: "DEVELOPER",
        status: "Active",
        firstName: "Pavan",
        lastName: "Virtue",
        staffCode: "VR-USR-PAVAN-01",
        schoolId: "VIVA",
        branchId: "VIVA-BR-01"
      } as any
    });
    console.log("Created new developer record.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
