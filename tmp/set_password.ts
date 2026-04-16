import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function setPassword() {
  const email = "pavan@virtueschool.com";
  const password = "Virtue@2026";
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  console.log("Updating password for:", email);

  const staff = await prisma.staff.update({
    where: { 
      branchId_email: {
        branchId: "SYSTEM-CORE",
        email: email
      }
    },
    data: {
      passwordHash: hash,
      status: "Active"
    }
  });

  console.log("Password hash updated successfully for", staff.id);
  console.log("You can now login with password: Virtue@2026");
}

setPassword()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
