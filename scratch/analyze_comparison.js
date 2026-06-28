const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
  const filePath = "C:\\Users\\SriKriations\\Favorites\\Downloads\\test of accounts (1).xlsx";
  console.log("Analyzing and comparing Excel data with database...");

  try {
    const workbook = XLSX.readFile(filePath);
    
    // Read sheets
    const studentMasterSheet = workbook.Sheets["STUDENT_MASTER"];
    const feeCollectionSheet = workbook.Sheets["FEE_COLLECTION"];
    const dueTrackerSheet = workbook.Sheets["DUE_TRACKER"];
    const feeMasterSheet = workbook.Sheets["FEE_MASTER"];
    const transportMasterSheet = workbook.Sheets["TRANSPORT_MASTER"];

    const excelStudents = XLSX.utils.sheet_to_json(studentMasterSheet, { defval: "" });
    const excelCollections = XLSX.utils.sheet_to_json(feeCollectionSheet, { defval: "" });
    const excelDues = XLSX.utils.sheet_to_json(dueTrackerSheet, { defval: "" });
    const excelFees = XLSX.utils.sheet_to_json(feeMasterSheet, { defval: "" });
    const excelTransport = XLSX.utils.sheet_to_json(transportMasterSheet, { defval: "" });

    console.log(`\n--- Excel Summary ---`);
    console.log(`Excel Student Master: ${excelStudents.length} rows`);
    console.log(`Excel Fee Collections: ${excelCollections.length} rows`);
    console.log(`Excel Due Tracker: ${excelDues.length} rows`);
    console.log(`Excel Fee Master: ${excelFees.length} rows`);
    console.log(`Excel Transport Master: ${excelTransport.length} rows`);

    // Fetch all DB students
    const dbStudents = await prisma.student.findMany({
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        branchId: true,
        schoolId: true,
        financial: {
          select: {
            annualTuition: true,
            admissionFee: true,
            totalDiscount: true
          }
        }
      }
    });
    console.log(`\n--- DB Summary ---`);
    console.log(`DB Students: ${dbStudents.length} records`);

    // Cross-reference Students by Admission Number
    const dbAdmMap = new Map();
    const dbNameMap = new Map();

    dbStudents.forEach(s => {
      if (s.admissionNumber) {
        dbAdmMap.set(s.admissionNumber.toUpperCase().trim(), s);
      }
      const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toUpperCase().replace(/\s+/g, ' ').trim();
      dbNameMap.set(fullName, s);
    });

    let idMatches = 0;
    let nameMatchesOnly = 0;
    let missingInDb = 0;
    const missingSample = [];

    excelStudents.forEach(es => {
      const admiNo = es["Admi No"]?.toString().toUpperCase().trim();
      const esName = es["Student Name"]?.toString().toUpperCase().replace(/\s+/g, ' ').trim();
      
      let matched = false;
      if (admiNo && dbAdmMap.has(admiNo)) {
        idMatches++;
        matched = true;
      } else if (esName && dbNameMap.has(esName)) {
        nameMatchesOnly++;
        matched = true;
      } else {
        missingInDb++;
        if (missingSample.length < 5) {
          missingSample.push({ admiNo, name: esName, branch: es["Branch"], class: es["Class"] });
        }
      }
    });

    console.log(`\n--- Student Match Analysis ---`);
    console.log(`Students matched by exact Admission Number: ${idMatches}`);
    console.log(`Students matched by Name only (different/missing Adm No in DB): ${nameMatchesOnly}`);
    console.log(`Students present in Excel but missing in DB: ${missingInDb}`);
    if (missingSample.length > 0) {
      console.log("Sample of missing students in DB:", JSON.stringify(missingSample, null, 2));
    }

    // Check financial mismatch on matched students
    let tuitionMismatches = 0;
    const mismatchSample = [];

    excelStudents.forEach(es => {
      const admiNo = es["Admi No"]?.toString().toUpperCase().trim();
      const esName = es["Student Name"]?.toString().toUpperCase().replace(/\s+/g, ' ').trim();
      let dbStudent = null;

      if (admiNo && dbAdmMap.has(admiNo)) {
        dbStudent = dbAdmMap.get(admiNo);
      } else if (esName && dbNameMap.has(esName)) {
        dbStudent = dbNameMap.get(esName);
      }

      if (dbStudent && dbStudent.financial) {
        const dbTuition = Number(dbStudent.financial.annualTuition || 0);
        const excelTuition = Number(es["Tuition Fee"] || 0);

        if (dbTuition !== excelTuition) {
          tuitionMismatches++;
          if (mismatchSample.length < 5) {
            mismatchSample.push({
              name: esName,
              admiNo: admiNo || dbStudent.admissionNumber,
              excelTuition,
              dbTuition
            });
          }
        }
      }
    });

    console.log(`\n--- Fee Mismatch Analysis ---`);
    console.log(`Tuition fee mismatches on matched students: ${tuitionMismatches}`);
    if (mismatchSample.length > 0) {
      console.log("Sample of fee mismatches:", JSON.stringify(mismatchSample, null, 2));
    }

    // Collections comparison
    const dbCollections = await prisma.collection.findMany({
      select: {
        receiptNumber: true,
        amountPaid: true,
        student: {
          select: {
            admissionNumber: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    const dbReceiptMap = new Map();
    dbCollections.forEach(c => {
      if (c.receiptNumber) {
        dbReceiptMap.set(c.receiptNumber.toUpperCase().trim(), c);
      }
    });

    let collectionMatches = 0;
    let collectionMissing = 0;
    let excelTotalCollection = 0;
    let dbTotalCollection = dbCollections.reduce((sum, c) => sum + Number(c.amountPaid || 0), 0);

    excelCollections.forEach(ec => {
      const receiptNo = ec["Receipt No"]?.toString().toUpperCase().trim();
      excelTotalCollection += Number(ec["Total"] || 0);

      // Check if receipt number matches. In Excel, it is a number (e.g. 305) but in DB it's like VIVES-MNB-FY 2026-27-REC-00005
      // Let's check if the DB receipt contains the receipt number
      let found = false;
      if (receiptNo) {
        for (const [dbReceipt, coll] of dbReceiptMap.entries()) {
          if (dbReceipt.endsWith(`REC-${receiptNo.padStart(5, '0')}`) || dbReceipt === receiptNo) {
            found = true;
            collectionMatches++;
            break;
          }
        }
      }

      if (!found) {
        collectionMissing++;
      }
    });

    console.log(`\n--- Collection & Payout Analysis ---`);
    console.log(`Excel total collections sum: ₹${excelTotalCollection.toLocaleString()}`);
    console.log(`DB total collections sum: ₹${dbTotalCollection.toLocaleString()}`);
    console.log(`Receipts from Excel matching DB: ${collectionMatches}`);
    console.log(`Receipts from Excel missing in DB: ${collectionMissing}`);

  } catch (error) {
    console.error("Error running comparison analysis:", error);
  } finally {
    await prisma.$disconnect();
  }
}

analyze();
