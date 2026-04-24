import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function run() {
    process.env.SKIP_TENANCY = 'true';
    console.log("🧹 COMMENCING FINAL SOVEREIGN GENESIS CORRECTION...");
    
    try {
        await prisma.$transaction(async (tx) => {
            // Delete all legacy/corrupted artifacts
            const ghostIds = ['V-VIV-HQ', 'BAD-ID'];
            
            for (const ghostId of ghostIds) {
                await tx.staff.deleteMany({ where: { schoolId: ghostId }});
                await tx.branch.deleteMany({ where: { schoolId: ghostId }});
                await tx.school.deleteMany({ where: { id: ghostId }});
            }
            
            console.log("✅ CORRUPTED DNA PURGED.");

            // 🏛️ SOVEREIGN RE-GENESIS (100% SPEC COMPLIANT)
            const schoolCode = "VIVES";
            const schoolName = "VIVEK VANI EDUCATIONAL SOCIETY";
            
            const school = await tx.school.create({
                data: {
                    id: schoolCode,
                    name: schoolName,
                    code: schoolCode,
                    email: "info@vives.edu.in",
                    phone: "+91-99999-99999",
                    address: "Reddy Colony",
                }
            });

            const hqBranch = await tx.branch.create({
                data: {
                    id: "VIVES-HQ",
                    schoolId: school.id,
                    name: "Administrative HQ",
                    code: "HQ",
                    address: "Reddy Colony"
                }
            });

            await tx.branch.create({
                data: {
                    id: "VIVES-RCB",
                    schoolId: school.id,
                    name: "Reddy Coloney Branch",
                    code: "RCB",
                    address: "Reddy Colony"
                }
            });

            // 🛡️ OWNER IDENTITY
            const passwordHash = await bcrypt.hash("Virtue@2026", 10);
            await tx.staff.create({
                data: {
                    id: "VIVES-HQ-OWNR-0001",
                    staffCode: "VIVES-HQ-OWNR-0001",
                    firstName: "VIVEK",
                    lastName: "VANI",
                    email: "owner@vives.edu.in",
                    phone: "+91-88888-88888",
                    schoolId: school.id,
                    branchId: hqBranch.id,
                    role: "OWNER",
                    status: "ACTIVE",
                    onboardingStatus: "JOINED",
                    username: "vives_owner",
                    passwordHash
                }
            });

            console.log(`🚀 GENESIS RESTORED: School ID: ${school.id}`);
        });
    } catch (e) {
        console.error("❌ RE-GENESIS FAILED:", e);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

run();
