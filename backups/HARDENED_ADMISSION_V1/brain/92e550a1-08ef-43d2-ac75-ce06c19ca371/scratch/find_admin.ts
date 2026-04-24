import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findFirst({
    where: { 
      OR: [
        { email: { contains: "admin" } },
        { firstName: { contains: "admin" } }
      ]
    }
  });
  console.log("Admin Staff:", JSON.stringify(staff, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
