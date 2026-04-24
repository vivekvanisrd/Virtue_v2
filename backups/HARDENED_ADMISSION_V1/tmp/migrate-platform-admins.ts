import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * 🛡️ SOVEREIGN IDENTITY MIGRATION: PLATFORM GUARD (v2.3)
 * 
 * Migrating Developer identities to the dedicated PlatformAdmin table
 * to ensure physical segregation and purge-safety.
 */
async function migrate() {
    console.log("🛡️ Starting PlatformAdmin Migration...");

    try {
        const passwordHash = await bcrypt.hash("Virtue@2026", 10);

        const devs = [
            {
                name: "Vivek Vani",
                email: "vivek@virtue.dev",
                username: "vivek_dev",
                passwordHash: passwordHash,
                metadata: { role: "CHIEF_ARCHITECT" }
            },
            {
                name: "Antigravity AI",
                email: "ai@virtue.dev",
                username: "antigravity",
                passwordHash: passwordHash,
                metadata: { role: "SYSTEM_CO_PILOT" }
            }
        ];

        for (const dev of devs) {
            await prisma.platformAdmin.upsert({
                where: { username: dev.username },
                update: {},
                create: dev
            });
            console.log(`✅ PlatformAdmin provisioned: ${dev.username}`);
        }

        console.log("\n🚀 MIGRATION SUCCESSFUL. Developer identities are now physically segregated.");

    } catch (error) {
        console.error("❌ MIGRATION FAILED:", error);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
