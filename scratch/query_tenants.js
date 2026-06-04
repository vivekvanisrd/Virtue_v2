const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const schools = await prisma.school.findMany();
    console.log("🏫 Schools:", schools.map(s => ({ id: s.id, name: s.name })));
    const branches = await prisma.branch.findMany();
    console.log("🏛️ Branches:", branches.map(b => ({ id: b.id, name: b.name, schoolId: b.schoolId })));
  } catch (err) {
    console.error("Error querying tenants:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
