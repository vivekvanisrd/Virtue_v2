import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * 🏛️ SOVEREIGN IDENTITY SEED (v3.1)
 * Re-instantiating the Global Developer account after the Nuclear Purge.
 */
async function seedPlatformAdmin() {
    console.log("🧬 INITIATING SOVEREIGN IDENTITY SEED...");

    const email = "vivekvanisrd@gmail.com";
    const password = "Virtue@369";
    const name = "Sovereign Developer";

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        const admin = await prisma.platformAdmin.upsert({
            where: { email },
            update: {
                passwordHash,
                name
            },
            create: {
                email,
                username: "vivek",
                name,
                passwordHash
            }
        });

        console.log(`✅ SUCCESS: Sovereign Identity Instantiated: ${admin.email}`);
    } catch (e: any) {
        console.error("❌ SEED FAILED:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

seedPlatformAdmin();
