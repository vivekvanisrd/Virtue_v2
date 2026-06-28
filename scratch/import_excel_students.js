const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const schoolId = 'VIVES';
const branchId = 'VIVES-RCB';
const academicYearId = 'VIVES-HQ-AY-2026-27';

function normalizeName(name) {
  if (!name) return "";
  return name.toString().toUpperCase()
    .replace(/[\s\.\-]+/g, "")
    .trim();
}

function normalizeAdm(adm) {
  if (!adm) return "";
  let s = adm.toString().toUpperCase().trim();
  s = s.replace(/-2[56](-\d+)?$/, "");
  s = s.replace(/-FY\d+$/, "");
  s = s.replace(/^VR[O0]/, "VR0");
  s = s.replace(/^VS[O0]/, "VS0");
  s = s.replace(/^VM[O0]/, "VM0");
  s = s.replace(/^VK[O0]/, "VK0");
  s = s.replace(/[^A-Z0-9]/g, "");
  return s;
}

function cleanPhone(phone) {
  if (!phone) return null;
  return phone.toString().replace(/[^0-9]/g, "").trim() || null;
}

function splitName(nameStr) {
  if (!nameStr) return { firstName: "[MISSING NAME]", middleName: null, lastName: null };
  const parts = nameStr.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: null, lastName: null };
  } else if (parts.length === 2) {
    return { firstName: parts[0], middleName: null, lastName: parts[1] };
  } else {
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(' '),
      lastName: parts[parts.length - 1]
    };
  }
}

// Class mapping from Excel Class values to database Class names
const classMapping = {
  "NUR": "Nursery",
  "LKG": "LKG",
  "PP1": "LKG",
  "UKG": "UKG",
  "PP2": "UKG",
  "1ST": "1st Grade",
  "2ND": "2nd Grade",
  "3RD": "3rd Grade",
  "4TH": "4th Grade",
  "5TH": "5th Grade",
  "6TH": "6th Grade",
  "7TH": "7th Grade",
  "8TH": "8th Grade",
  "9TH": "9th Grade",
  "10TH": "10th Grade"
};

async function main() {
  const filePath = "C:\\Users\\SriKriations\\Favorites\\Downloads\\test of accounts (1).xlsx";
  console.log(`Loading workbook from: ${filePath}`);
  
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['STUDENT_MASTER'];
  if (!sheet) {
    console.error("Sheet 'STUDENT_MASTER' not found!");
    process.exit(1);
  }
  
  const excelStudents = XLSX.utils.sheet_to_json(sheet, { defval: "" })
    .filter(r => (r['Student Name'] || "").toString().trim() !== "");
  
  console.log(`Loaded ${excelStudents.length} students from STUDENT_MASTER.`);

  // Fetch all existing students in DB
  const dbStudents = await prisma.student.findMany({
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      branchId: true,
      academic: {
        select: {
          classId: true,
          class: { select: { name: true } }
        }
      }
    }
  });
  console.log(`Loaded ${dbStudents.length} students from Database.`);

  // Helper maps for duplicate checking
  const dbAdmMap = new Map();
  const dbNameClassMap = new Map();

  dbStudents.forEach(s => {
    if (s.admissionNumber) {
      dbAdmMap.set(normalizeAdm(s.admissionNumber), s);
    }
    const fullNameNorm = normalizeName(`${s.firstName || ""} ${s.lastName || ""}`);
    const classNameNorm = s.academic?.class?.name ? normalizeName(s.academic.class.name) : "";
    if (fullNameNorm && classNameNorm) {
      dbNameClassMap.set(`${fullNameNorm}_${classNameNorm}`, s);
    }
  });

  // Fetch all Classes and Sections for the RCB branch
  const dbClasses = await prisma.class.findMany({
    where: { branchId },
    include: { sections: true }
  });

  // Fetch all Fee Structures for the RCB branch
  const dbFeeStructures = await prisma.feeStructure.findMany({
    where: { branchId },
    include: { components: { include: { masterComponent: true } } }
  });

  // Fee components cache
  const feeComponents = await prisma.feeComponentMaster.findMany({
    where: { schoolId }
  });
  const tuitionCompMaster = feeComponents.find(c => c.name.toLowerCase().includes("tuition"));
  const admissionCompMaster = feeComponents.find(c => c.name.toLowerCase().includes("admission"));
  const transportCompMaster = feeComponents.find(c => c.name.toLowerCase().includes("transport"));

  console.log("\nStarting duplicate check and import process...");

  let skippedCount = 0;
  let importedCount = 0;
  let errorCount = 0;

  for (const row of excelStudents) {
    const originalAdm = (row['Admi No'] || "").toString().trim();
    const normAdm = normalizeAdm(originalAdm);
    const esName = (row['Student Name'] || "").toString().trim();
    const normName = normalizeName(esName);
    const rawClass = (row['Class'] || "").toString().trim().toUpperCase();
    const mappedClassName = classMapping[rawClass] || rawClass;
    const normClass = normalizeName(mappedClassName);

    // 1. Duplicate check by Admission Number
    let isDuplicate = false;
    let duplicateReason = "";

    if (normAdm && dbAdmMap.has(normAdm)) {
      isDuplicate = true;
      duplicateReason = `Admission Number match (${originalAdm})`;
    } else if (normName && normClass && dbNameClassMap.has(`${normName}_${normClass}`)) {
      isDuplicate = true;
      duplicateReason = `Name and Class match ("${esName}" in ${mappedClassName})`;
    }

    if (isDuplicate) {
      console.log(`⏩ [Skipped] Duplicate found: "${esName}" (${originalAdm}) - Reason: ${duplicateReason}`);
      skippedCount++;
      continue;
    }

    // 2. Resolve database Class and Section
    const resolvedClass = dbClasses.find(c => c.name.toLowerCase() === mappedClassName.toLowerCase());
    if (!resolvedClass) {
      console.error(`❌ [Error] Class "${rawClass}" (mapped to "${mappedClassName}") not found in DB for student "${esName}".`);
      errorCount++;
      continue;
    }

    const resolvedSection = resolvedClass.sections[0];
    if (!resolvedSection) {
      console.error(`❌ [Error] No sections found in class "${mappedClassName}" for student "${esName}".`);
      errorCount++;
      continue;
    }

    // 3. Resolve Fee Structure (Try 2026 structure, fallback to 2025)
    let feeStructure = dbFeeStructures.find(fs => fs.classId === resolvedClass.id && fs.name.includes("2026"));
    if (!feeStructure) {
      feeStructure = dbFeeStructures.find(fs => fs.classId === resolvedClass.id && fs.name.includes("2025"));
    }
    if (!feeStructure) {
      console.error(`❌ [Error] No fee structure found for class "${mappedClassName}" for student "${esName}".`);
      errorCount++;
      continue;
    }

    // 4. Extract and calculate fees from Excel
    const excelTuition = Number(row['Tuition Fee'] || 0);
    const excelAdmission = Number(row['Admission Fee'] || 0);
    const excelTransport = Number(row['Transport Fee'] || 0);
    const excelConcession = Number(row['Concession'] || 0);
    const annualTotal = excelTuition + excelAdmission + excelTransport;

    // Split name
    const nameParts = splitName(esName);
    const cleanedContact = cleanPhone(row['Contact']);
    const parentName = (row['Parent Name'] || "").toString().trim();

    try {
      // 5. Run atomic transaction for creating student, records, financial details, ledger entries and journal entries
      await prisma.$transaction(async (tx) => {
        // Create student profile
        const student = await tx.student.create({
          data: {
            admissionNumber: originalAdm || null,
            studentCode: originalAdm || null,
            schoolId,
            branchId,
            status: "Active",
            firstName: nameParts.firstName,
            middleName: nameParts.middleName,
            lastName: nameParts.lastName,
            phone: cleanedContact,
            gender: "Male",
            category: "General",

            academic: {
              create: {
                schoolId,
                branchId,
                academicYear: academicYearId,
                classId: resolvedClass.id,
                sectionId: resolvedSection.id,
                admissionDate: new Date()
              }
            },

            history: {
              create: {
                id: crypto.randomUUID(),
                schoolId,
                branchId,
                academicYearId,
                classId: resolvedClass.id,
                sectionId: resolvedSection.id,
                admissionNumber: originalAdm || null,
                studentCode: originalAdm || null,
                admissionDate: new Date(),
                promotionStatus: "NEW_ADMISSION",
                isGenesis: true
              }
            },

            family: {
              create: {
                schoolId,
                branchId,
                fatherName: parentName || "[MISSING]",
                fatherPhone: cleanedContact
              }
            },

            address: {
              create: {
                schoolId,
                branchId,
                currentAddress: "Sangareddy",
                permanentAddress: "Sangareddy",
                city: "Sangareddy",
                state: "Telangana",
                country: "India"
              }
            },

            financial: {
              create: {
                schoolId,
                branchId,
                feeStructureId: feeStructure.id,
                paymentType: "Term-wise",
                annualTuition: annualTotal,
                totalDiscount: excelConcession,
                tuitionFee: excelTuition,
                admissionFee: excelAdmission,
                transportFee: excelTransport,
                term1Amount: Math.floor(annualTotal * 0.35),

                components: {
                  create: [
                    // Tuition Fee component
                    ...(excelTuition > 0 && tuitionCompMaster ? [{
                      schoolId,
                      branchId,
                      componentId: tuitionCompMaster.id,
                      baseAmount: excelTuition,
                      discountAmount: excelConcession,
                      isApplicable: true,
                      lockReason: "ADMISSION_SYNC"
                    }] : []),
                    // Admission Fee component
                    ...(excelAdmission > 0 && admissionCompMaster ? [{
                      schoolId,
                      branchId,
                      componentId: admissionCompMaster.id,
                      baseAmount: excelAdmission,
                      discountAmount: 0,
                      isApplicable: true,
                      lockReason: "ADMISSION_SYNC"
                    }] : []),
                    // Transport Fee component
                    ...(excelTransport > 0 && transportCompMaster ? [{
                      schoolId,
                      branchId,
                      componentId: transportCompMaster.id,
                      baseAmount: excelTransport,
                      discountAmount: 0,
                      isApplicable: true,
                      lockReason: "ADMISSION_SYNC"
                    }] : [])
                  ]
                }
              }
            }
          }
        });

        // 6. Create Ledger Entries (charges and concession)
        const ledgerEntries = [];
        if (excelTuition > 0) {
          ledgerEntries.push({
            studentId: student.id,
            schoolId,
            branchId,
            academicYearId,
            type: "CHARGE",
            amount: excelTuition,
            reason: `Tuition Fee (${feeStructure.name})`,
            createdBy: "EXCEL_IMPORT"
          });
        }
        if (excelAdmission > 0) {
          ledgerEntries.push({
            studentId: student.id,
            schoolId,
            branchId,
            academicYearId,
            type: "CHARGE",
            amount: excelAdmission,
            reason: "Admission Fee",
            createdBy: "EXCEL_IMPORT"
          });
        }
        if (excelTransport > 0) {
          ledgerEntries.push({
            studentId: student.id,
            schoolId,
            branchId,
            academicYearId,
            type: "CHARGE",
            amount: excelTransport,
            reason: "Transport Fee",
            createdBy: "EXCEL_IMPORT"
          });
        }
        if (excelConcession > 0) {
          ledgerEntries.push({
            studentId: student.id,
            schoolId,
            branchId,
            academicYearId,
            type: "DISCOUNT",
            amount: excelConcession,
            reason: "Admission Concession",
            createdBy: "EXCEL_IMPORT"
          });
        }

        await tx.ledgerEntry.createMany({ data: ledgerEntries });

        // 7. Accrual Accounting Injection
        const [receivableAccount, activeFY] = await Promise.all([
          tx.chartOfAccount.findFirst({ where: { accountCode: "1200", schoolId } }),
          tx.financialYear.findFirst({ where: { schoolId, isCurrent: true } })
        ]);

        if (!receivableAccount || !activeFY) {
          throw new Error("Mandatory financial configuration (Receivables/FinancialYear) is missing.");
        }

        const incomeMapping = [];
        if (excelTuition > 0) {
          const coaTuition = await tx.chartOfAccount.findFirst({ where: { accountCode: "3001", schoolId } });
          incomeMapping.push({
            accountId: coaTuition ? coaTuition.id : receivableAccount.id,
            debit: 0,
            credit: excelTuition,
            description: "Accrual: Tuition Fee"
          });
        }
        if (excelAdmission > 0) {
          const coaAdmission = await tx.chartOfAccount.findFirst({ where: { accountCode: "3002", schoolId } });
          incomeMapping.push({
            accountId: coaAdmission ? coaAdmission.id : receivableAccount.id,
            debit: 0,
            credit: excelAdmission,
            description: "Accrual: Admission Fee"
          });
        }
        if (excelTransport > 0) {
          const coaTransport = await tx.chartOfAccount.findFirst({ where: { accountCode: "4105", schoolId } });
          incomeMapping.push({
            accountId: coaTransport ? coaTransport.id : receivableAccount.id,
            debit: 0,
            credit: excelTransport,
            description: "Accrual: Transport Fee"
          });
        }

        // Accrual Journal Entry
        await tx.journalEntry.create({
          data: {
            schoolId,
            branchId,
            financialYearId: activeFY.id,
            entryType: "ADMISSION_ACCRUAL",
            totalDebit: annualTotal,
            totalCredit: annualTotal,
            description: `Gross Charge Accrual for Student: ${originalAdm}`,
            lines: {
              create: [
                { accountId: receivableAccount.id, debit: annualTotal, credit: 0, description: "Total Fees Receivable" },
                ...incomeMapping
              ]
            }
          }
        });

        // Update AR balance
        await tx.chartOfAccount.update({
          where: { id: receivableAccount.id },
          data: { currentBalance: { increment: annualTotal } }
        });

        // Discount Offset Journal Entry
        if (excelConcession > 0) {
          const discountAccount = await tx.chartOfAccount.findFirst({
            where: {
              schoolId,
              OR: [
                { accountCode: "4400" },
                { accountName: { contains: "Discount", mode: "insensitive" } }
              ]
            }
          }) || await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "3001" } });

          if (discountAccount) {
            await tx.journalEntry.create({
              data: {
                schoolId,
                branchId,
                financialYearId: activeFY.id,
                entryType: "ADMISSION_DISCOUNT",
                totalDebit: excelConcession,
                totalCredit: excelConcession,
                description: `Admission Discount Offset: ${originalAdm}`,
                lines: {
                  create: [
                    { accountId: discountAccount.id, debit: excelConcession, credit: 0, description: "Discount Expense" },
                    { accountId: receivableAccount.id, debit: 0, credit: excelConcession, description: "Receivable Offset" }
                  ]
                }
              }
            });

            // Update AR balance for discount credit
            await tx.chartOfAccount.update({
              where: { id: receivableAccount.id },
              data: { currentBalance: { decrement: excelConcession } }
            });
          }
        }
      }, { timeout: 30000 });

      console.log(`✅ [Imported] Student: "${esName}" (Adm: ${originalAdm}) in Class "${mappedClassName}"`);
      importedCount++;

      // Update local maps for in-run duplicate checks
      if (normAdm) {
        dbAdmMap.set(normAdm, { admissionNumber: originalAdm });
      }
      if (normName && normClass) {
        dbNameClassMap.set(`${normName}_${normClass}`, { firstName: nameParts.firstName });
      }

    } catch (e) {
      console.error(`❌ [Error] Failed to import student "${esName}": ${e.message}`);
      errorCount++;
    }
  }

  console.log(`\n=== IMPORT COMPLETED ===`);
  console.log(`Students Skipped (Already Exist): ${skippedCount}`);
  console.log(`Students Successfully Imported:   ${importedCount}`);
  console.log(`Import Errors:                    ${errorCount}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal Error running main import:", err);
  prisma.$disconnect();
});
