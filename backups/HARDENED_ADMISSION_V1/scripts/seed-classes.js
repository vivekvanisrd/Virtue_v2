const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const classes = [
        { id: 'LKG', name: 'Lower Kindergarten', level: -1 },
        { id: 'UKG', name: 'Upper Kindergarten', level: 0 },
        { id: '1', name: 'Grade 1', level: 1 },
        { id: '2', name: 'Grade 2', level: 2 },
        { id: '10', name: 'Grade 10', level: 10 }
    ];

    for (const c of classes) {
        await prisma.class.upsert({
            where: { id: c.id },
            update: {},
            create: c
        });
    }

    console.log('✅ Standard classes seeded.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
