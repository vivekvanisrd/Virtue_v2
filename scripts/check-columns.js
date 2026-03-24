const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tableInfo = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Student'
    `;
    console.log(JSON.stringify(tableInfo, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
