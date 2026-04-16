import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const staffToFix = await prisma.staff.findMany({
        where: { staffCode: { startsWith: 'VIVA-USR-' } }
    });

    console.log(`Found ${staffToFix.length} staff to fix.`);

    for (const s of staffToFix) {
        const shortRole = s.role.substring(0, 3).toUpperCase();
        // Extract branch slug from branchId directly, or query it. We know it's RCB for this block.
        const branchSlug = "RCB"; 
        const type = `STAFF_${shortRole}_${branchSlug}`;
        
        const counter = await prisma.tenancyCounter.upsert({
            where: {
                schoolId_branchId_type_year: {
                    schoolId: s.schoolId,
                    branchId: branchSlug,
                    type,
                    year: "GLOBAL"
                }
            },
            update: { lastValue: { increment: 1 } },
            create: {
                schoolId: s.schoolId,
                branchId: branchSlug,
                type,
                year: "GLOBAL",
                lastValue: 1
            }
        });

        const newCode = `VIVA-${branchSlug}-${shortRole}-${counter.lastValue.toString().padStart(4, '0')}`;

        await prisma.staff.update({
            where: { id: s.id },
            data: { staffCode: newCode }
        });
        console.log(`Replaced ${s.staffCode} -> ${newCode}`);
    }
}

main().finally(() => prisma.$disconnect());
