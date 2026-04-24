import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 [CLEANSE] Starting Non-Destructive Identity Restoration (V2.1)...");

    const MAIN_BRANCH_ID = 'VIVA-BR-01';

    // 1. RE-NAMESPACE TEST DATA TO FREE UP IDs
    console.log("🧹 Re-namespacing legacy test records (Studen1, Studen2)...");
    const testStudents = await prisma.student.findMany({
        where: {
            OR: [
                { firstName: { startsWith: "Studen" } },
                { firstName: "John", lastName: "Doe" }
            ],
            branchId: MAIN_BRANCH_ID
        }
    });

    for (const t of testStudents) {
        await prisma.student.update({
            where: { id: t.id },
            data: {
                admissionNumber: `DUPE_ADM_${t.id.substring(0, 10)}`,
                studentCode: `DUPE_STU_${t.id.substring(0, 10)}`
            }
        });
    }
    console.log(`✅ ${testStudents.length} test records moved to DUPE namespace.`);

    // 2. PASS 1: SET TEMPORARY UNIQUE IDS FOR REAL DATA
    const realStudents = await prisma.student.findMany({
        where: { 
            branchId: MAIN_BRANCH_ID,
            NOT: { firstName: { startsWith: "Studen" } }
        }
    });
    console.log(`🔍 Processing ${realStudents.length} real students in MAIN.`);

    console.log("🔄 Pass 1: Temporary namespace shift...");
    for (const s of realStudents) {
        await prisma.student.update({
            where: { id: s.id },
            data: {
                admissionNumber: `TEMP_ADM_${s.id.substring(0, 10)}`,
                studentCode: `TEMP_STU_${s.id.substring(0, 10)}`
            }
        });
    }

    // 3. PASS 2: FINAL IDENTITY RE-ISSUANCE
    console.log("🔄 Pass 2: Finalizing V2.1 Identities...");
    for (const s of realStudents) {
        // Strip legacy markers and standardize
        const cleanReg = s.registrationId?.replace("_MAIN", "") || null;
        
        let rawAdm = s.admissionNumber?.replace("_MAIN", "").replace("RCB01", "MAIN") || null;
        let cleanStu = s.studentCode?.replace("_MAIN", "").replace("RCB01", "MAIN") || "";
        
        // Final Formatting to 5-digit
        if (cleanStu && (cleanStu.includes("-STU-") || cleanStu.includes("-OLD-"))) {
             cleanStu = cleanStu.replace("-OLD-", "-STU-");
             const parts = cleanStu.split("-");
             const seqPart = parts[parts.length - 1];
             parts[parts.length - 1] = seqPart.padStart(5, '0');
             cleanStu = parts.join("-");
        }

        console.log(`   🛠️  Standardizing ${s.firstName}: ${cleanStu}`);

        await prisma.student.update({
            where: { id: s.id },
            data: {
                admissionNumber: rawAdm,
                studentCode: cleanStu,
                registrationId: cleanReg
            }
        });

        // 4. Update Audit Record IDs
        await prisma.academicRecord.updateMany({
            where: { studentId: s.id },
            data: { id: `ACAD_${s.id.substring(0, 20)}` }
        });

        await prisma.academicHistory.updateMany({
            where: { studentId: s.id },
            data: { id: `HIST_${s.id.substring(0, 20)}` }
        });
    }

    console.log("\n✅ [CLEANSE] Identities Successfully Restored to V2.1 Spec.");
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
