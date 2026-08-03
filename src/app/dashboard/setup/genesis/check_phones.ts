import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const total = await p.staff.count();
  const noPhone = await p.staff.findMany({
    where: { OR: [{ phone: null }, { phone: "" }, { phone: "0000000000" }] },
    select: { staffCode: true, firstName: true, lastName: true, role: true, phone: true }
  });
  console.log(`Total staff: ${total}`);
  console.log(`Missing/placeholder phone: ${noPhone.length}`);
  noPhone.forEach(s => console.log(`  → ${s.staffCode} | ${s.firstName} ${s.lastName} | role:${s.role} | phone:${s.phone}`));
}
main().catch(console.error).finally(() => p.$disconnect());
