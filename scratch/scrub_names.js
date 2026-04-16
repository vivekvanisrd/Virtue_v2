const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sanitize = (name) => {
    if (!name) return "";
    return name
        .replace(/\./g, ' ')       // Period to space
        .replace(/\s+/g, ' ')      // Collapse multi-space
        .trim();                   // Trim edges
};

async function main() {
    console.log("🛠️ Starting Institutional Name Sanitization SCRUB...");

    // 1. Scrub Staff Table
    const staff = await prisma.staff.findMany({
        where: {
            OR: [
                { firstName: { contains: '.' } },
                { lastName: { contains: '.' } },
                { firstName: { contains: '  ' } },
                { lastName: { contains: '  ' } }
            ]
        }
    });

    console.log(`🔍 Found ${staff.length} Staff records needing sanitization.`);
    let staffCount = 0;
    for (const s of staff) {
        const cleanFirst = sanitize(s.firstName);
        const cleanLast = sanitize(s.lastName);
        if (cleanFirst !== s.firstName || cleanLast !== s.lastName) {
            await prisma.staff.update({
                where: { id: s.id },
                data: { firstName: cleanFirst, lastName: cleanLast }
            });
            staffCount++;
        }
    }

    // 2. Scrub StaffBank Table
    const banks = await prisma.staffBank.findMany({
        where: {
            OR: [
                { accountName: { contains: '.' } },
                { accountName: { contains: '  ' } }
            ]
        }
    });

    console.log(`🔍 Found ${banks.length} StaffBank records needing sanitization.`);
    let bankCount = 0;
    for (const b of banks) {
        const cleanName = sanitize(b.accountName);
        if (cleanName !== b.accountName) {
            await prisma.staffBank.update({
                where: { id: b.id },
                data: { accountName: cleanName }
            });
            bankCount++;
        }
    }

    console.log(`\n✅ Institutional Scrub Complete:`);
    console.log(`   - Staff Records Cleaned: ${staffCount}`);
    console.log(`   - Bank Records Cleaned: ${bankCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
