const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const filePath = "C:\\Users\\SriKriations\\Favorites\\Downloads\\test of accounts (1).xlsx";
  console.log(`Loading workbook: ${filePath}`);

  try {
    const workbook = XLSX.readFile(filePath);

    // Helper to get active rows (non-empty student name or admi no)
    const getActiveRows = (sheetName, nameCol = "Student Name", admCol = "Admi No") => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return [];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      return rows.filter(r => {
        const name = (r[nameCol] || "").toString().trim();
        const adm = (r[admCol] || "").toString().trim();
        return name !== "" || adm !== "";
      });
    };

    const excelStudents = getActiveRows("STUDENT_MASTER");
    const excelCollections = getActiveRows("FEE_COLLECTION");
    const excelDues = getActiveRows("DUE_TRACKER");
    const excelJune = getActiveRows("IMPORT_JUNE");

    console.log(`\n--- Active Excel Rows Summary ---`);
    console.log(`Active Students in STUDENT_MASTER: ${excelStudents.length}`);
    console.log(`Active Collections in FEE_COLLECTION: ${excelCollections.length}`);
    console.log(`Active Dues in DUE_TRACKER: ${excelDues.length}`);
    console.log(`Active June Imports in IMPORT_JUNE: ${excelJune.length}`);

    // Retrieve DB students
    const dbStudents = await prisma.student.findMany({
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        branchId: true,
        schoolId: true,
        status: true,
        financial: {
          select: {
            annualTuition: true,
            tuitionFee: true,
            admissionFee: true,
            totalDiscount: true,
            transportFee: true
          }
        }
      }
    });

    console.log(`\n--- DB Students Summary ---`);
    console.log(`Total Students in DB: ${dbStudents.length}`);

    // Build DB Lookup Maps
    const dbAdmMap = new Map();
    const dbNameMap = new Map();
    dbStudents.forEach(s => {
      if (s.admissionNumber) {
        dbAdmMap.set(s.admissionNumber.toUpperCase().trim(), s);
      }
      const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toUpperCase().replace(/\s+/g, ' ').trim();
      dbNameMap.set(fullName, s);
    });

    // 1. Audit Student Master
    console.log(`\n=================== 1. STUDENT MASTER AUDIT ===================`);
    let studentMatches = 0;
    let studentNameMatches = 0;
    let studentMissing = [];
    const matchedPairs = [];

    excelStudents.forEach(es => {
      const esAdm = (es["Admi No"] || "").toString().toUpperCase().trim();
      const esName = (es["Student Name"] || "").toString().toUpperCase().replace(/\s+/g, ' ').trim();

      let matchedDb = null;
      let matchType = "";

      if (esAdm && dbAdmMap.has(esAdm)) {
        matchedDb = dbAdmMap.get(esAdm);
        matchType = "Admission Number";
        studentMatches++;
      } else if (esName && dbNameMap.has(esName)) {
        matchedDb = dbNameMap.get(esName);
        matchType = "Name Only";
        studentNameMatches++;
      }

      if (matchedDb) {
        matchedPairs.push({ excel: es, db: matchedDb, matchType });
      } else {
        studentMissing.push(es);
      }
    });

    console.log(`Matched by Admission Number: ${studentMatches}`);
    console.log(`Matched by Name only: ${studentNameMatches}`);
    console.log(`Total Excel Students missing in DB: ${studentMissing.length}`);

    if (studentMissing.length > 0) {
      console.log(`\nList of Excel Students missing in DB (Total ${studentMissing.length}):`);
      studentMissing.forEach((s, idx) => {
        console.log(`  ${idx + 1}. AdmNo: "${s["Admi No"]}", Name: "${s["Student Name"]}", Class: "${s["Class"]}", Branch: "${s["Branch"]}"`);
      });
    }

    // Compare tuition, admission, transport fees & concessions for matched students
    console.log(`\n--- Financial Comparison for Matched Students ---`);
    let financialMismatchesCount = 0;
    const financialMismatchesList = [];

    matchedPairs.forEach(pair => {
      const es = pair.excel;
      const db = pair.db;
      const dbFin = db.financial || {};

      const excelTuition = Number(es["Tuition Fee"] || 0);
      const dbTuition = Number(dbFin.annualTuition || dbFin.tuitionFee || 0);

      const excelConcession = Number(es["Concession"] || 0);
      const dbDiscount = Number(dbFin.totalDiscount || 0);

      const excelAdmission = Number(es["Admission Fee"] || 0);
      const dbAdmission = Number(dbFin.admissionFee || 0);

      const excelTransport = Number(es["Transport Fee"] || 0);
      const dbTransport = Number(dbFin.transportFee || 0);

      const diffs = [];
      if (excelTuition !== dbTuition) {
        diffs.push(`Tuition: Excel ₹${excelTuition} vs DB ₹${dbTuition}`);
      }
      if (excelConcession !== dbDiscount) {
        diffs.push(`Concession: Excel ₹${excelConcession} vs DB ₹${dbDiscount}`);
      }
      if (excelAdmission !== dbAdmission) {
        diffs.push(`Admission: Excel ₹${excelAdmission} vs DB ₹${dbAdmission}`);
      }
      if (excelTransport !== dbTransport) {
        diffs.push(`Transport: Excel ₹${excelTransport} vs DB ₹${dbTransport}`);
      }

      if (diffs.length > 0) {
        financialMismatchesCount++;
        financialMismatchesList.push({
          name: es["Student Name"],
          admNo: es["Admi No"] || db.admissionNumber,
          matchType: pair.matchType,
          diffs
        });
      }
    });

    console.log(`Total students with financial mismatches (out of ${matchedPairs.length} matched): ${financialMismatchesCount}`);
    if (financialMismatchesList.length > 0) {
      financialMismatchesList.forEach(m => {
        console.log(`  - Student: "${m.name}" (AdmNo: ${m.admNo}, matched by ${m.matchType})`);
        m.diffs.forEach(d => console.log(`      * ${d}`));
      });
    }

    // 2. Audit Collections
    console.log(`\n=================== 2. COLLECTIONS AUDIT ===================`);
    const dbCollections = await prisma.collection.findMany({
      select: {
        id: true,
        receiptNumber: true,
        amountPaid: true,
        paymentMode: true,
        paymentDate: true,
        paymentReference: true,
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

    let excelTotalCollectionSum = 0;
    let matchedCollectionsCount = 0;
    const unmatchedExcelCollections = [];

    excelCollections.forEach(ec => {
      const receiptNo = (ec["Receipt No"] || "").toString().toUpperCase().trim();
      const amount = Number(ec["Total"] || 0);
      excelTotalCollectionSum += amount;

      // Match receipt
      let matchedDbColl = null;
      if (receiptNo) {
        // Direct match
        if (dbReceiptMap.has(receiptNo)) {
          matchedDbColl = dbReceiptMap.get(receiptNo);
        } else {
          // Check suffix/contains (e.g. REC-00305, etc.)
          for (const [dbReceipt, coll] of dbReceiptMap.entries()) {
            if (dbReceipt.endsWith(`REC-${receiptNo.padStart(5, '0')}`) || dbReceipt.includes(`-REC-${receiptNo}`)) {
              matchedDbColl = coll;
              break;
            }
          }
        }
      }

      if (matchedDbColl) {
        matchedCollectionsCount++;
        // Verify amount
        const dbAmount = Number(matchedDbColl.amountPaid || 0);
        if (dbAmount !== amount) {
          console.log(`  [Warning] Receipt amount mismatch for ${ec["Student Name"]} (Receipt ${receiptNo}): Excel ₹${amount} vs DB ₹${dbAmount}`);
        }
      } else {
        unmatchedExcelCollections.push(ec);
      }
    });

    const dbTotalCollectionSum = dbCollections.reduce((sum, c) => sum + Number(c.amountPaid || 0), 0);

    console.log(`Excel total collections: ₹${excelTotalCollectionSum.toLocaleString()} (${excelCollections.length} records)`);
    console.log(`DB total collections: ₹${dbTotalCollectionSum.toLocaleString()} (${dbCollections.length} records)`);
    console.log(`Matched collections (by Receipt No): ${matchedCollectionsCount}`);
    console.log(`Excel collections missing in DB: ${unmatchedExcelCollections.length}`);

    if (unmatchedExcelCollections.length > 0) {
      console.log(`\nSample of unmatched collections in Excel (First 15):`);
      unmatchedExcelCollections.slice(0, 15).forEach((uc, idx) => {
        console.log(`  ${idx + 1}. Receipt No: ${uc["Receipt No"]}, Date: ${uc["Date"]}, Student: "${uc["Student Name"]}", AdmNo: "${uc["Admi No"]}", Total: ₹${uc["Total"]}, Mode: Cash ₹${uc["Cash"]} / Online ₹${uc["Online"]}`);
      });
    }

    // 3. Due Tracker Audit
    console.log(`\n=================== 3. DUE TRACKER AUDIT ===================`);
    let dueTrackerMatchedCount = 0;
    const dueTrackerMismatches = [];

    excelDues.forEach(ed => {
      const edAdm = (ed["Admi No"] || "").toString().toUpperCase().trim();
      const edName = (ed["Student Name"] || "").toString().toUpperCase().replace(/\s+/g, ' ').trim();

      // Find matched student in Excel STUDENT_MASTER or DB
      let excelStud = excelStudents.find(s => (s["Admi No"] || "").toString().toUpperCase().trim() === edAdm);
      if (!excelStud && edName) {
        excelStud = excelStudents.find(s => (s["Student Name"] || "").toString().toUpperCase().replace(/\s+/g, ' ').trim() === edName);
      }

      const excelDueTuition = Number(ed["Tuition Fee"] || 0);
      const excelPaidTuition = Number(ed["Tuition Paid"] || 0);
      const excelBalanceTuition = Number(ed["Tuition Balance"] || 0);

      const computedBalance = excelDueTuition - Number(ed["Concession"] || 0) - excelPaidTuition;
      if (Math.abs(computedBalance - excelBalanceTuition) > 1) {
        dueTrackerMismatches.push({
          name: ed["Student Name"],
          adm: ed["Admi No"],
          details: `Tuition: Due ₹${excelDueTuition} - Concession ₹${ed["Concession"]} - Paid ₹${excelPaidTuition} = Computed Balance ₹${computedBalance} vs Sheet Balance ₹${excelBalanceTuition}`
        });
      }
    });

    console.log(`Total students audited in DUE_TRACKER: ${excelDues.length}`);
    console.log(`Mathematical balance mismatches in DUE_TRACKER: ${dueTrackerMismatches.length}`);
    if (dueTrackerMismatches.length > 0) {
      dueTrackerMismatches.forEach(m => {
        console.log(`  - Student: "${m.name}" (${m.adm}) -> ${m.details}`);
      });
    }

    // 4. June Import Sheet Comparison
    console.log(`\n=================== 4. JUNE IMPORT AUDIT ===================`);
    let juneTotalSum = 0;
    excelJune.forEach(ej => {
      juneTotalSum += Number(ej["Total"] || 0);
    });
    console.log(`Total records in IMPORT_JUNE: ${excelJune.length}`);
    console.log(`Total amount in IMPORT_JUNE: ₹${juneTotalSum.toLocaleString()}`);

  } catch (error) {
    console.error("Error running audit comparison script:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
