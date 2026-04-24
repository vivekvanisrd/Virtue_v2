const { PrismaClient } = require('@prisma/client');

async function testConnection() {
    console.log("Initializing Prisma Client...");
    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
        datasources: {
            db: {
                url: "postgresql://postgres:VivekeVani%40369@db.bmyhbgwyirvjeadpvwny.supabase.co:6543/postgres?pgbouncer=true"
            }
        }
    });

    try {
        console.log("Fetching Admins:");
        const pAdmins = await prisma.platformAdmin.findMany({ select: { name: true, email: true, username: true } });
        console.table(pAdmins);
        
        console.log("\nFetching Staff:");
        const staff = await prisma.staff.findMany({ 
            select: { firstName: true, role: true, email: true, username: true, branch: { select: { code: true } } } 
        });
        console.table(staff.map(s => ({
            Name: s.firstName,
            Role: s.role,
            Email: s.email,
            Username: s.username,
            Branch: s.branch?.code
        })));
    } catch (e) {
        console.error("CONNECTION FAILED:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
