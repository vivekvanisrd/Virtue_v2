const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("=== CONSTRAINTS FOR VEHICLE & VEHICLESTOP ===");
    const constraints = await prisma.$queryRaw`
      SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name IN ('Vehicle', 'VehicleStop')
    `;
    console.log(JSON.stringify(constraints, null, 2));
  } catch (err) {
    console.error("Error executing raw query:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();


