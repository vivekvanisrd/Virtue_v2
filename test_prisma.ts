import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    const staffId = 'STF-2026-001';
    console.log("Finding staff...");
    const staff = await prisma.staff.findFirst({
      where: { id: staffId }
    });
    console.log("Staff:", staff);

    if (staff) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        console.log("Finding attendance...");
        const existing = await prisma.staffAttendance.findFirst({
            where: { staffId: staffId, date: { gte: today, lt: tomorrow } }
        });
        console.log("Existing:", existing);
    }
  } catch(e) {
    console.error("PRISMA ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
