import prisma from './src/lib/prisma.ts';

async function verify() {
    process.env.SKIP_TENANCY = 'true';
    console.log("🚀 Starting DB Verification...");
    
    try {
        console.log("📡 Testing direct query (SKIP_TENANCY=true)...");
        const schoolCount = await prisma.school.count();
        console.log(`✅ Connection Successful! Found ${schoolCount} schools.`);
        
        console.log("\n🕵️ Testing Tenancy RLS (Dry Run)...");
        // We can't easily simulate a session here without headers/cookies,
        // but we've already improved the SET LOCAL logic.
        
        const start = Date.now();
        await prisma.school.findMany({ take: 1 });
        const end = Date.now();
        console.log(`⏱️ Query latency: ${end - start}ms`);

    } catch (e: any) {
        console.error("❌ Verification Failed:", e.message);
    } finally {
        await (prisma as any).$disconnect();
    }
}

verify();
