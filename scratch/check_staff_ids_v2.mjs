import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkIds() {
  try {
    const staff = await prisma.staff.findMany({
      where: {
        branchId: 'VIVES-RCB'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      select: {
        staffCode: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    });

    console.log('--- LATEST STAFF CODES IN BRANCH VIVES-RCB ---');
    staff.forEach(s => {
      console.log(`[${s.createdAt.toISOString()}] ${s.staffCode} - ${s.firstName} ${s.lastName} (${s.role})`);
    });
    
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkIds();
