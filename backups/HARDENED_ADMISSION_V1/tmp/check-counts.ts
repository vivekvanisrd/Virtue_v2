import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
    const feeCount = await prisma.feeComponentMaster.count();
    const schoolCount = await prisma.school.count();
    const staffCount = await prisma.staff.count();
    
    console.log(`📡 TOTAL_FEE_COMPONENTS: ${feeCount}`);
    console.log(`📡 TOTAL_SCHOOLS:        ${schoolCount}`);
    console.log(`📡 TOTAL_STAFF:          ${staffCount}`);
    
    await prisma.$disconnect();
}
check();
