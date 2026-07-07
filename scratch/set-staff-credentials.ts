import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = "virtue123";
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  console.log(`🔐 Hashing password "${password}"...`);
  console.log(`Hash: ${hash}`);

  // 1. Update Pranisha (id: 77e59c11-8c6f-467d-a259-774c162d7973)
  const pranisha = await prisma.staff.update({
    where: { id: "77e59c11-8c6f-467d-a259-774c162d7973" },
    data: {
      username: "pranisha",
      passwordHash: hash,
      onboardingStatus: "COMPLETED" // Completed onboarding so they don't get forced to change password immediately
    }
  });

  console.log(`✅ Updated Pranisha:`);
  console.log(`   - Name: ${pranisha.firstName} ${pranisha.lastName}`);
  console.log(`   - Username: ${pranisha.username}`);
  console.log(`   - Email: ${pranisha.email}`);
  console.log(`   - Staff Code: ${pranisha.staffCode}`);

  // 2. Update Sanjana (id: 9399a13b-c215-4fd0-a164-01e5b694337e)
  const sanjana = await prisma.staff.update({
    where: { id: "9399a13b-c215-4fd0-a164-01e5b694337e" },
    data: {
      username: "sanjana",
      passwordHash: hash,
      onboardingStatus: "COMPLETED"
    }
  });

  console.log(`✅ Updated Sanjana:`);
  console.log(`   - Name: ${sanjana.firstName} ${sanjana.lastName}`);
  console.log(`   - Username: ${sanjana.username}`);
  console.log(`   - Email: ${sanjana.email}`);
  console.log(`   - Staff Code: ${sanjana.staffCode}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
