const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function test() {
    console.log("📡 Testing Connection to Pooler...");
    console.log("URL:", process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@')); // Hide password
    
    const prisma = new PrismaClient();
    
    try {
        const start = Date.now();
        const count = await prisma.school.count();
        const end = Date.now();
        console.log(`✅ Success! School Count: ${count}`);
        console.log(`⏱️ Latency: ${end - start}ms`);
    } catch (e) {
        console.error("❌ Connection Failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
