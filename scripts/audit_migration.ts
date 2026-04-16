import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("=== POST-MIGRATION AUDIT ===\n");

    const rcbStaff = await prisma.staff.count({ where: { branchId: 'RCB' } });
    const mainStaff = await prisma.staff.count({ where: { branchId: 'VIVA-BR-01' } });
    const rcbBranch = await prisma.branch.findUnique({ where: { id: 'RCB' } });

    console.log(`RCB Staff Count: ${rcbStaff}`);
    console.log(`MAIN Staff Count: ${mainStaff}`);
    console.log(`RCB Branch Exists: ${!!rcbBranch}`);

    if (rcbStaff > 0) {
        const sample = await prisma.staff.findFirst({ where: { branchId: 'RCB' } });
        console.log(`Sample RCB Staff: ${sample?.firstName} ${sample?.lastName} (Code: ${sample?.staffCode})`);
    }

    console.log("\n=== AUDIT COMPLETE ===");
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
