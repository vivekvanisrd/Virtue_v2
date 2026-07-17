const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== STAFF USERS IN DATABASE ===");
  const staffList = await prisma.staff.findMany({
    take: 10,
    select: {
      id: true,
      staffCode: true,
      firstName: true,
      lastName: true,
      role: true,
      email: true,
      phone: true,
      status: true
    }
  });

  staffList.forEach(s => {
    console.log(`StaffCode: ${s.staffCode}, Name: ${s.firstName} ${s.lastName || ""}, Role: ${s.role}, Email: ${s.email}, Status: ${s.status}`);
  });
  
  console.log("\n=== PARENT USERS IN DATABASE ===");
  const parentList = await prisma.guardian.findMany({
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true
    }
  });
  parentList.forEach(p => {
    console.log(`Parent: ${p.firstName} ${p.lastName || ""}, Email: ${p.email}, Phone: ${p.phone}`);
  });
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
