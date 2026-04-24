const path = require("path");
// Manually load dotenv from the root
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding passwords for all staff...");
  try {
    const staff = await prisma.staff.findMany();
    
    for (const s of staff) {
      const password = "Virtue@2026";
      const passwordHash = await bcrypt.hashSync(password, 10);
      const username = s.email ? s.email.split('@')[0] : `user_${s.id.slice(0, 4)}`;
      
      await prisma.staff.update({
        where: { id: s.id },
        data: { 
          passwordHash,
          username: s.username || username
        }
      });
      console.log(`Updated ${s.email || s.staffCode} | Username: ${s.username || username} | Pass: ${password}`);
    }
    
    console.log("Seeding complete.");
  } catch (e) {
    console.error("Seed error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
