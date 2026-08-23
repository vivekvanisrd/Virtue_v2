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

function cleanPhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return null;
}

async function main() {
  console.log("=== FORENSIC AUDIT: GOOGLE SHEET VS ERP DATABASE ===");

  const csvPath = "C:\\Users\\SriKriations\\.gemini\\antigravity-ide\\brain\\45a92914-49f5-4e4e-88af-2774fe2fa999\\.system_generated\\steps\\1133\\content.md";
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n");

  // 1. Analyze Sheet Lines
  let sheetHeaderLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Student Name") && lines[i].includes("Parent Name")) {
      sheetHeaderLine = i;
      break;
    }
  }

  interface SheetRow {
    lineNo: number;
    admNo: string;
    studentName: string;
    parentName: string;
    phone: string | null;
    branch: string;
    className: string;
    rawLine: string;
  }

  const validSheetRows: SheetRow[] = [];
  const invalidOrMetadataLines: { lineNo: number; text: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (i <= sheetHeaderLine) {
      invalidOrMetadataLines.push({ lineNo: i + 1, text: rawLine });
      continue;
    }
    if (!rawLine || rawLine.startsWith("---") || rawLine.startsWith("Title:") || rawLine.startsWith("Source:")) {
      invalidOrMetadataLines.push({ lineNo: i + 1, text: rawLine });
      continue;
    }

    const cols = parseCSVLine(rawLine);
    const studentName = cols[1]?.toUpperCase().trim() || "";

    if (!studentName || studentName === "STUDENT NAME" || studentName.includes("TOTAL") || studentName.includes("SUMMARY")) {
      invalidOrMetadataLines.push({ lineNo: i + 1, text: rawLine });
      continue;
    }

    validSheetRows.push({
      lineNo: i + 1,
      admNo: cols[0]?.toUpperCase().trim() || "",
      studentName,
      parentName: cols[2]?.toUpperCase().trim() || "",
      phone: cleanPhone(cols[3] || ""),
      branch: cols[4]?.toUpperCase().trim() || "",
      className: cols[5]?.toUpperCase().trim() || "",
      rawLine
    });
  }

  console.log(`Total File Lines: ${lines.length}`);
  console.log(`Valid Student Data Rows in Google Sheet: ${validSheetRows.length}`);
  console.log(`Metadata / Empty / Footer / Summary Lines in CSV File: ${invalidOrMetadataLines.length}`);

  // 2. Check Duplicates within the Sheet itself
  const seenSheetAdmMap = new Map<string, SheetRow[]>();
  const seenSheetNamePhoneMap = new Map<string, SheetRow[]>();

  for (const r of validSheetRows) {
    if (r.admNo) {
      if (!seenSheetAdmMap.has(r.admNo)) seenSheetAdmMap.set(r.admNo, []);
      seenSheetAdmMap.get(r.admNo)!.push(r);
    }
    const namePhoneKey = `${r.studentName}_${r.phone || "NO_PHONE"}`;
    if (!seenSheetNamePhoneMap.has(namePhoneKey)) seenSheetNamePhoneMap.set(namePhoneKey, []);
    seenSheetNamePhoneMap.get(namePhoneKey)!.push(r);
  }

  const internalSheetAdmDuplicates = Array.from(seenSheetAdmMap.entries()).filter(([_, rows]) => rows.length > 1);
  const internalSheetNamePhoneDuplicates = Array.from(seenSheetNamePhoneMap.entries()).filter(([_, rows]) => rows.length > 1);

  console.log(`Internal Duplicates by Admission Number inside Google Sheet: ${internalSheetAdmDuplicates.length} admission codes repeated`);
  console.log(`Internal Duplicates by Student Name + Phone inside Google Sheet: ${internalSheetNamePhoneDuplicates.length} student entries repeated`);

  // 3. Query Live Database Students
  const dbStudents = await prisma.student.findMany({
    where: { schoolId: SCHOOL_ID },
    include: {
      family: true,
      academic: { include: { class: true } },
      branch: true
    }
  });

  console.log(`Total Current ERP DB Students for School 'VIVES': ${dbStudents.length}`);

  // 4. Map DB students by admission number & name+phone
  const dbAdmMap = new Map<string, typeof dbStudents[0]>();
  const dbNamePhoneMap = new Map<string, typeof dbStudents[0]>();

  for (const s of dbStudents) {
    if (s.admissionNumber) {
      dbAdmMap.set(s.admissionNumber.toUpperCase().trim(), s);
    }
    const phone = s.family?.fatherPhone ? cleanPhone(s.family.fatherPhone) : "";
    const nameKey = `${s.firstName.toUpperCase().trim()}${s.lastName ? " " + s.lastName.toUpperCase().trim() : ""}_${phone || "NO_PHONE"}`;
    dbNamePhoneMap.set(nameKey, s);
  }

  // 5. Cross Check Sheet vs DB
  let sheetRowsFoundInDB = 0;
  let sheetRowsMissingFromDB: SheetRow[] = [];

  for (const r of validSheetRows) {
    const matchedByAdm = r.admNo ? dbAdmMap.get(r.admNo) : null;
    const nameKey = `${r.studentName}_${r.phone || "NO_PHONE"}`;
    const matchedByNamePhone = dbNamePhoneMap.get(nameKey);

    if (matchedByAdm || matchedByNamePhone) {
      sheetRowsFoundInDB++;
    } else {
      sheetRowsMissingFromDB.push(r);
    }
  }

  // 6. DB Students NOT in Google Sheet
  const dbStudentsNotInSheet: typeof dbStudents[0][] = [];
  const sheetAdmSet = new Set(validSheetRows.map(r => r.admNo).filter(Boolean));

  for (const s of dbStudents) {
    const adm = s.admissionNumber?.toUpperCase().trim() || "";
    if (adm && !sheetAdmSet.has(adm)) {
      dbStudentsNotInSheet.push(s);
    }
  }

  const auditReport = {
    fileTotalLines: lines.length,
    validSheetStudentRows: validSheetRows.length,
    headerMetadataSummaryLines: invalidOrMetadataLines.length,
    duplicateAdmissionCodesInSheet: internalSheetAdmDuplicates.length,
    duplicateStudentEntriesInSheet: internalSheetNamePhoneDuplicates.length,
    sheetRowsPresentInDB: sheetRowsFoundInDB,
    sheetRowsMissingFromDBCount: sheetRowsMissingFromDB.length,
    totalStudentsInDB: dbStudents.length,
    dbStudentsNotInSheetCount: dbStudentsNotInSheet.length,
    sampleMissingRowsFromDB: sheetRowsMissingFromDB.slice(0, 10),
    sampleDBStudentsNotInSheet: dbStudentsNotInSheet.slice(0, 10).map(s => ({
      id: s.id,
      admNo: s.admissionNumber,
      name: `${s.firstName} ${s.lastName || ""}`.trim(),
      phone: s.family?.fatherPhone,
      createdAt: s.createdAt
    }))
  };

  console.log("=== AUDIT RESULTS ===");
  console.log(JSON.stringify(auditReport, null, 2));

  fs.writeFileSync("scratch/sheet_vs_db_audit.json", JSON.stringify(auditReport, null, 2));
}

main().catch(console.error);
