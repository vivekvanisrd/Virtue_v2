const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function test() {
    console.log("📡 Testing Connection to Pooler...");
    console.log("URL:", process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@')); // Hide password
    
    const startInit = Date.now();
    const prisma = new PrismaClient();
    const endInit = Date.now();
    console.log(`⏱️ Prisma Client creation: ${endInit - startInit}ms`);
    
    try {
        for (let i = 1; i <= 5; i++) {
            const start = Date.now();
            const count = await prisma.school.count();
            const end = Date.now();
            console.log(`✅ Query #${i} Success! Count: ${count} | Latency: ${end - start}ms`);
        }
    } catch (e) {
        console.error("❌ Connection Failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
