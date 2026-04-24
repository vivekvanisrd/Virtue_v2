import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("🏛️  VIRTUE GENESIS AUDIT: COMMENCING INSPECTION...");
    
    const school = await prisma.school.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
            branches: true,
            staff: {
                take: 5,
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!school) {
        console.error("❌ ERROR: No schools found in the registry.");
        process.exit(1);
    }

    console.log(`\n[SCHOOL]: ${school.name} (${school.code})`);
    console.log(`- ID: ${school.id} (Rule 1 Compliance: ${school.id === school.code ? "✅" : "❌"})`);
    
    school.branches.forEach(b => {
        console.log(`\n[BRANCH]: ${b.name} (${b.code})`);
        console.log(`- ID: ${b.id}`);
        const expectedPrefix = `${school.code}-`;
        console.log(`- DNA Match: ${b.id.startsWith(expectedPrefix) ? "✅" : "❌"} (Expected prefix: ${expectedPrefix})`);
    });

    school.staff.forEach(s => {
        console.log(`\n[STAFF/OWNER]: ${s.firstName} ${s.lastName} (${s.role})`);
        console.log(`- ID: ${s.id}`);
        console.log(`- Username: ${s.username}`);
        console.log(`- Institutional Jail: ${s.schoolId === school.id ? "✅" : "❌"}`);
    });

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
