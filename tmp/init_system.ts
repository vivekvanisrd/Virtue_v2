import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function initSystem() {
  console.log("Initializing System Root for Developer...");

  // 1. Create System School
  const school = await prisma.school.upsert({
    where: { id: "SYSTEM" },
    update: {},
    create: {
      id: "SYSTEM",
      code: "SYSTEM",
      name: "Virtue Core System",
      status: "Active"
    }
  });
  console.log("School 'SYSTEM' ensured.");

  // 2. Create Core Branch
  const branch = await prisma.branch.upsert({
    where: { id: "SYSTEM-CORE" },
    update: {},
    create: {
      id: "SYSTEM-CORE",
      schoolId: "SYSTEM",
      name: "Platform Core",
      code: "CORE"
    }
  });
  console.log("Branch 'SYSTEM-CORE' ensured.");

  // 3. Create Developer Staff Record
  const email = "pavan@virtueschool.com";
  const staff = await prisma.staff.upsert({
    where: { 
      branchId_email: {
        branchId: "SYSTEM-CORE",
        email: email
      }
    },
    update: {
      role: "DEVELOPER",
      status: "ACTIVE"
    },
    create: {
      id: "DEV-PAVAN-001",
      staffCode: "DEV-01",
      firstName: "Pavan",
      lastName: "Developer",
      email: email,
      role: "DEVELOPER",
      status: "ACTIVE",
      schoolId: "SYSTEM",
      branchId: "SYSTEM-CORE"
    }
  });
  console.log("Staff record for 'pavan@virtueschool.com' created/updated as DEVELOPER.");
  console.log("Success! You can now attempt to claim or login to this account.");
}

initSystem()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
