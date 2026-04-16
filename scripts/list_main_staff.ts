import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const s = await prisma.staff.findMany({ where: { branchId: 'VIVA-BR-01' } });
    console.log("Current Staff Codes in MAIN:");
    console.log(JSON.stringify(s.map(x => x.staffCode), null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
