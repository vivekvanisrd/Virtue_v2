const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Checking all StaffStatutory records...");
  const records = await prisma.staffStatutory.findMany({});
  
  console.log(`Found ${records.length} statutory records.`);
  
  const stats = records.map(r => ({
    id: r.id,
    staffId: r.staffId,
    pan: r.panNumber === "" ? "[EMPTY_STRING]" : r.panNumber,
    pf: r.pfNumber === "" ? "[EMPTY_STRING]" : r.pfNumber,
    uan: r.uanNumber === "" ? "[EMPTY_STRING]" : r.uanNumber,
    esi: r.esiNumber === "" ? "[EMPTY_STRING]" : r.esiNumber,
    aadhaar: r.aadhaarNumber === "" ? "[EMPTY_STRING]" : r.aadhaarNumber,
  }));
  
  console.table(stats);

  // Check if there are duplicates of empty strings in statutory fields
  const fields = ['panNumber', 'pfNumber', 'uanNumber', 'esiNumber'];
  for (const field of fields) {
    const emptyCount = records.filter(r => r[field] === "").length;
    console.log(`Field '${field}' has ${emptyCount} empty string ("") records.`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
