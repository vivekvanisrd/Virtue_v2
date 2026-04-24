import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const pAdmins = await prisma.platformAdmin.findMany({ select: { name: true, email: true, username: true } });
    console.log('--- PLATFORM ADMINS ---');
    console.table(pAdmins);
    
    const staff = await prisma.staff.findMany({ 
        select: { firstName: true, role: true, email: true, username: true, branch: { select: { code: true } } } 
    });
    console.log('\n--- STAFF MEMBERS ---');
    console.table(staff.map(s => ({
        Name: s.firstName,
        Role: s.role,
        Email: s.email,
        Username: s.username,
        Branch: s.branch?.code
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
