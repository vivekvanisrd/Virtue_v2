import fs from "fs";
import { prismaBypass as prisma } from "../src/lib/prisma";

const SCHOOL_ID = "VIVES";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  console.log("=== AUDITING SPECIFIC TAB: 'STUDENT_MASTER' ===");

  const csvPath = "scratch/tab_STUDENT_MASTER.csv";
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n");

  console.log(`Total raw lines in 'STUDENT_MASTER' tab CSV: ${lines.length}`);

  // Find header line in STUDENT_MASTER
  let headerLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Student Name") && (lines[i].includes("Admi No") || lines[i].includes("Receipt No"))) {
      headerLineIndex = i;
      break;
    }
  }

  console.log(`Found header at line ${headerLineIndex + 1}: ${lines[headerLineIndex]}`);

  interface MasterRecord {
    lineNo: number;
    slNo: string;
    date: string;
    receiptNo: string;
    admNo: string;
    studentName: string;
    cash: number;
    online: number;
    total: number;
    paymentFor: string;
    feeHead: string;
    collectedBy: string;
    transactionRef: string;
    entryStatus: string;
    pendingAmount: number;
    remarks: string;
  }

  const masterRecords: MasterRecord[] = [];
  const nonDataLines: { lineNo: number; text: string }[] = [];

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    const studentName = cols[4]?.toUpperCase().trim() || "";
    const admNo = cols[3]?.toUpperCase().trim() || "";

    if (!studentName || studentName === "STUDENT NAME" || studentName.includes("TOTAL")) {
      nonDataLines.push({ lineNo: i + 1, text: line });
      continue;
    }

    masterRecords.push({
      lineNo: i + 1,
      slNo: cols[0] || "",
      date: cols[1] || "",
      receiptNo: cols[2] || "",
      admNo,
      studentName,
      cash: Number(cols[5] || 0),
      online: Number(cols[6] || 0),
      total: Number(cols[7] || 0),
      paymentFor: cols[8] || "",
      feeHead: cols[9] || "",
      collectedBy: cols[10] || "",
      transactionRef: cols[11] || "",
      entryStatus: cols[12] || "",
      pendingAmount: Number(cols[13] || 0),
      remarks: cols[14] || ""
    });
  }

  console.log(`Total Valid Transaction / Student Records in STUDENT_MASTER Tab: ${masterRecords.length}`);

  // Unique Admission Codes in STUDENT_MASTER
  const uniqueAdmNos = new Set(masterRecords.map(r => r.admNo).filter(Boolean));
  console.log(`Unique Admission Numbers in STUDENT_MASTER Tab: ${uniqueAdmNos.size}`);

  // Unique Student Names in STUDENT_MASTER
  const uniqueStudentNames = new Set(masterRecords.map(r => r.studentName).filter(Boolean));
  console.log(`Unique Student Names in STUDENT_MASTER Tab: ${uniqueStudentNames.size}`);

  // Query Database for School VIVES
  const dbStudents = await prisma.student.findMany({
    where: { schoolId: SCHOOL_ID },
    include: {
      family: true,
      academic: { include: { class: true } }
    }
  });

  console.log(`Total Students in ERP Database for VIVES: ${dbStudents.length}`);

  // Cross check DB students vs STUDENT_MASTER tab
  const dbAdmSet = new Set(dbStudents.map(s => s.admissionNumber?.toUpperCase().trim()).filter(Boolean));
  const dbNameSet = new Set(dbStudents.map(s => `${s.firstName} ${s.lastName || ""}`.toUpperCase().trim()));

  let masterAdmMatched = 0;
  let masterNameMatched = 0;
  const unmatchedFromMaster: MasterRecord[] = [];

  for (const r of masterRecords) {
    if (r.admNo && dbAdmSet.has(r.admNo)) {
      masterAdmMatched++;
    } else if (dbNameSet.has(r.studentName)) {
      masterNameMatched++;
    } else {
      unmatchedFromMaster.push(r);
    }
  }

  console.log(`Matched by Admission Number in DB: ${masterAdmMatched}`);
  console.log(`Matched by Name in DB: ${masterNameMatched}`);
  console.log(`Unmatched Records in STUDENT_MASTER Tab: ${unmatchedFromMaster.length}`);

  const report = {
    totalTabLines: lines.length,
    validRecordsInStudentMaster: masterRecords.length,
    uniqueAdmissionNumbersInStudentMaster: uniqueAdmNos.size,
    uniqueStudentNamesInStudentMaster: uniqueStudentNames.size,
    totalStudentsInDatabase: dbStudents.length,
    unmatchedFromMasterCount: unmatchedFromMaster.length,
    sampleUnmatched: unmatchedFromMaster.slice(0, 15)
  };

  fs.writeFileSync("scratch/student_master_audit_result.json", JSON.stringify(report, null, 2));
  console.log("=== AUDIT SUMMARY ===");
  console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error);
