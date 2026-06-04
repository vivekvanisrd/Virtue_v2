const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: "postgresql://postgres:VivekeVani%40369@db.bmyhbgwyirvjeadpvwny.supabase.co:6543/postgres?pgbouncer=true"
            }
        }
    });

    try {
        console.log("=== ACTIVE DATABASE QUERIES ===");
        const activeQueries = await prisma.$queryRawUnsafe(`
            SELECT pid, query, state, age(clock_timestamp(), query_start)::text as duration
            FROM pg_stat_activity 
            WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%'
            ORDER BY query_start ASC;
        `);
        console.table(activeQueries);

        console.log("\n=== GRANTED/PENDING LOCKS ON STUDENT TABLES ===");
        const locks = await prisma.$queryRawUnsafe(`
            SELECT pid, mode, granted, locktype, relation::regclass::text as table_name
            FROM pg_locks l
            JOIN pg_class c ON l.relation = c.oid
            WHERE c.relname IN ('Student', 'AcademicRecord', 'FamilyDetail', 'Address')
        `);
        console.table(locks);

    } catch (e) {
        console.error("Query failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
