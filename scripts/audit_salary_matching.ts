import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
    console.log("📊 [AUDIT] Starting Salary Record Matching Analysis...");

    const csvPath = path.join("j:/virtue_fb/virtue-v2/tmp/salaries_2.csv");
    if (!fs.existsSync(csvPath)) {
        console.error("❌ CSV file not found at:", csvPath);
        return;
    }

    const content = fs.readFileSync(csvPath, "utf-8");
    const lines = content.split("\n").filter(l => l.trim().length > 0);
    
    // Skip first 2 lines (Header Rows)
    const dataLines = lines.slice(2);

    const dbStaff = await prisma.staff.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
            staffCode: true
        }
    });

    const results = {
        matched: [] as any[],
        unmatched: [] as any[],
        totalCsvRows: dataLines.length
    };

    for (const line of dataLines) {
        const parts = line.split(",");
        if (parts.length < 5) continue;

        const csvName = parts[1]?.trim().toUpperCase();
        if (!csvName) continue;

        // Matching Logic: Try exact full name or normalized first+last
        const match = dbStaff.find(s => {
            const dbFullName = `${s.firstName}${s.lastName ? " " + s.lastName : ""}`.toUpperCase();
            return dbFullName === csvName || s.firstName.toUpperCase() === csvName;
        });

        if (match) {
            results.matched.push({
                csvName,
                dbName: `${match.firstName} ${match.lastName}`,
                staffCode: match.staffCode,
                netSalary: parts[7]
            });
        } else {
            results.unmatched.push(csvName);
        }
    }

    console.log("\n✅ MATCHED STAFF (" + results.matched.length + "):");
    results.matched.forEach(m => {
        console.log(`   [MATCH] ${m.csvName.padEnd(25)} -> ${m.staffCode} (${m.dbName})`);
    });

    if (results.unmatched.length > 0) {
        console.log("\n❌ UNMATCHED STAFF (" + results.unmatched.length + "):");
        results.unmatched.forEach(name => {
            console.log(`   [MISS]  ${name}`);
        });
    }

    console.log(`\n📈 SUMMARY: ${results.matched.length}/${results.totalCsvRows} matched successfully.`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
