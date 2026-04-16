import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkUser() {
  const email = "pavan@virtueschool.com";
  console.log("Checking for user:", email);
  
  const staff = await prisma.staff.findFirst({
    where: { email: email },
    include: { school: true, branch: true }
  });

  if (staff) {
    console.log("Found Staff Record:");
    console.log("ID:", staff.id);
    console.log("Name:", staff.firstName, staff.lastName);
    console.log("Role:", staff.role);
    console.log("School ID:", staff.schoolId, " (Code:", staff.school?.code, ")");
    console.log("Branch ID:", staff.branchId, " (Code:", staff.branch?.code, ")");
    console.log("User ID (Supabase Link):", staff.userId);
  } else {
    console.log("No staff record found with this email.");
  }
}

checkUser()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
