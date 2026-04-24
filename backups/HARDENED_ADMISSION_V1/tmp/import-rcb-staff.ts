import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Starting RCB Staff Import...");

    // Ensure the RCB Branch exists first
    await prisma.branch.upsert({
       where: { id: "RCB" },
       update: {},
       create: {
         id: "RCB",
         schoolId: "VIVA",
         name: "RCB Branch",
         code: "RCB",
         address: "Imported Auto"
       }
    });

    const csvPath = path.join(process.cwd(), 'tmp', 'salaries_2.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');

    let importedCount = 0;

    for (let i = 2; i <= 40; i++) { // Lines 3 to 41 (0-indexed array 2 to 40)
        let line = lines[i];
        if (!line) continue;
        
        // Handle weird CSV splits with quotes or just split by comma
        // The data is clean enough to split by comma
        const cols = line.split(',');
        
        const slNo = cols[0]?.trim();
        const name = cols[1]?.trim();
        const accNo = cols[2]?.trim();
        const ifsc = cols[3]?.trim();
        const actualSalaryStr = cols[4]?.trim();
        
        // Skip empty names or non-numeric SL.NOs
        if (!slNo || isNaN(Number(slNo)) || !name || !actualSalaryStr) continue;

        const basicSalary = Number(actualSalaryStr);
        if (isNaN(basicSalary)) continue;

        let role = "STAFF";
        let designation = "Unassigned";

        // Management Overrides
        if (name.toLowerCase().includes("akshitha")) {
            role = "PRINCIPAL";
            designation = "Principal";
        } else if (name.toLowerCase().includes("manjula nori")) {
            role = "OWNER";
            designation = "Working Partner / Coordinator";
        } else if (name.toLowerCase().includes("manjula reddy")) {
            role = "TEACHER";
            designation = "Vice Principal";
        } else {
            // Default generic teacher fallback for visual ease
            designation = "Staff";
        }

        // Generate ID
        const codeSuffix = slNo.padStart(3, '0');
        const staffCode = `STF-RCB-${codeSuffix}`;

        try {
            await prisma.$transaction(async (tx) => {
                // Check if exists to be idempotent
                let staff = await tx.staff.findFirst({ where: { schoolId: "VIVA", staffCode }});
                
                if (!staff) {
                    staff = await tx.staff.create({
                        data: {
                            schoolId: "VIVA",
                            branchId: "RCB",
                            staffCode,
                            firstName: name,
                            lastName: "",
                            status: "Active",
                            role: role as any,
                            professional: {
                                create: {
                                    designation: designation,
                                    department: "Academics",
                                    dateOfJoining: new Date("2026-03-01"), // Before March payroll
                                    basicSalary,
                                    hraAmount: 0,
                                    daAmount: 0,
                                    specialAllowance: 0,
                                    transportAllowance: 0,
                                }
                            },
                        }
                    });

                    // Add Bank details if present
                    if (accNo && ifsc && accNo.length > 5 && ifsc.length > 4) {
                        await tx.staffBank.create({
                            data: {
                                staffId: staff.id,
                                accountName: name,
                                accountNumber: accNo,
                                ifscCode: ifsc,
                                bankName: "Imported Bank"
                            }
                        });
                    }
                    
                    console.log(`✅ Created: ${staffCode} | ${name} | Rol: ${role} | Sal: ${basicSalary}`);
                    importedCount++;
                } else {
                    console.log(`⚠️ Skipped (Already Exists): ${staffCode}`);
                }
            });
        } catch (e: any) {
            console.error(`❌ Failed to import row ${slNo} (${name}): ${e.message}`);
        }
    }

    console.log(`🎉 Import Complete. Total newly imported staff: ${importedCount}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
