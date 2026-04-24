const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const normalize = (name) => {
    if (!name) return "";
    return name
        .replace(/\./g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

async function main() {
    console.log("🚀 Starting Sovereign Historical & Banking Ledger Import...");

    const staffInDb = await prisma.staff.findMany({
        select: { id: true, firstName: true, lastName: true, schoolId: true, branchId: true }
    });

    const staffMap = {};
    staffInDb.forEach(s => {
        const fullName = normalize(`${s.firstName} ${s.lastName}`);
        staffMap[fullName] = s;
    });

    const historicalData = JSON.parse(fs.readFileSync('j:/virtue_fb/virtue-v2/scratch/final_attendance_report_v2.json', 'utf-8'));
    
    let matched = 0;
    let skipped = 0;
    let updatedBanks = 0;
    let createdSlips = 0;
    let createdAttendance = 0;

    const months = [...new Set(historicalData.map(d => d.month))];
    const payrollRunMap = {};

    for (const mStr of months) {
        const [mName, yearStr] = mStr.split(' ');
        const year = parseInt(yearStr);
        const month = new Date(Date.parse(mName +" 1, 2012")).getMonth() + 1;
        
        const sampleStaff = staffInDb[0];
        if (!sampleStaff) {
            console.error("❌ No staff found in DB.");
            return;
        }

        const run = await prisma.payrollRun.upsert({
            where: {
                schoolId_month_year: {
                    schoolId: sampleStaff.schoolId,
                    month,
                    year
                }
            },
            update: {},
            create: {
                schoolId: sampleStaff.schoolId,
                branchId: sampleStaff.branchId,
                month,
                year,
                status: "Approved",
                totalGross: 0,
                totalNet: 0,
                processedBy: "Migration Engine",
                processedAt: new Date()
            }
        });
        payrollRunMap[mStr] = run.id;
        console.log(`✅ Anchor established for ${mStr} (ID: ${run.id})`);
    }

    for (const record of historicalData) {
        const normName = normalize(record.name);
        const staff = staffMap[normName];

        if (!staff) {
            console.log(`⚠️  Skipping [${record.name}] - Mismatch.`);
            skipped++;
            continue;
        }

        matched++;
        const [mName, yearStr] = record.month.split(' ');
        const year = parseInt(yearStr);
        const monthOrdinal = new Date(Date.parse(mName +" 1, 2012")).getMonth() + 1;

        try {
            // 1. BACKFILL BANK DETAILS
            if (record.accountNumber && record.ifscCode) {
                const bankName = record.ifscCode.toUpperCase().startsWith("UTIB") ? "Axis Bank" : "External Bank";
                
                await prisma.staffBank.upsert({
                    where: { staffId: staff.id },
                    update: {
                        accountNumber: record.accountNumber,
                        ifscCode: record.ifscCode,
                        accountName: `${staff.firstName} ${staff.lastName}`,
                        bankName: bankName
                    },
                    create: {
                        staffId: staff.id,
                        schoolId: staff.schoolId,
                        branchId: staff.branchId,
                        accountNumber: record.accountNumber,
                        ifscCode: record.ifscCode,
                        accountName: `${staff.firstName} ${staff.lastName}`,
                        bankName: bankName
                    }
                });
                updatedBanks++;
            }

            // 2. SYNTHESIZE ATTENDANCE
            const attendedCount = Math.floor(record.attendedDays);
            const attendanceToCreate = [];
            for (let day = 1; day <= Math.min(attendedCount, 28); day++) {
                const date = new Date(year, monthOrdinal - 1, day);
                attendanceToCreate.push({
                    staffId: staff.id,
                    schoolId: staff.schoolId,
                    branchId: staff.branchId,
                    date,
                    status: "Present",
                    remarks: "Historical Synthesis"
                });
            }

            if (attendanceToCreate.length > 0) {
                const result = await prisma.staffAttendance.createMany({
                    data: attendanceToCreate,
                    skipDuplicates: true
                });
                createdAttendance += result.count;
            }

            // 3. CREATE SALARY SLIP
            const existingSlip = await prisma.salarySlip.findUnique({
                where: {
                    payrollRunId_staffId: {
                        payrollRunId: payrollRunMap[record.month],
                        staffId: staff.id
                    }
                }
            });

            if (!existingSlip) {
                const netAmt = parseFloat(record.netSalary || 0);
                await prisma.salarySlip.create({
                    data: {
                        payrollRunId: payrollRunMap[record.month],
                        staffId: staff.id,
                        schoolId: staff.schoolId,
                        branchId: staff.branchId,
                        baseAmount: netAmt, 
                        grossSalary: netAmt,
                        netSalary: netAmt,
                        status: "Paid",
                        attendedDays: record.attendedDays,
                        totalWorkingDays: record.totalDays || 30,
                        snapshot: { historical: true, source: "Excel Import" }
                    }
                });
                createdSlips++;
            }
        } catch (err) {
            console.error(`❌ Error for ${record.name}:`, err.message);
        }
    }

    console.log("\n📊 Migration Complete:");
    console.log(`   - Records Matched: ${matched}`);
    console.log(`   - Records Skipped: ${skipped}`);
    console.log(`   - Slips Created: ${createdSlips}`);
    console.log(`   - Bank Profiles Restored: ${updatedBanks}`);
    console.log(`   - Attendance Pulses Synced: ${createdAttendance}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
