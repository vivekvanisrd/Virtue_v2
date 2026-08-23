import fs from "fs";
import { prismaBypass as prisma } from "../src/lib/prisma";

const SCHOOL_ID = "VIVES";
const BRANCH_CODE_MAP: Record<string, string> = {
  "RCB": "VIVES-RCB",
  "SNB": "VIVES-SNB",
  "MNB": "VIVES-MNB"
};

const CLASS_NAME_MAP: Record<string, string> = {
  "NUR": "Nursery",
  "NURSERY": "Nursery",
  "LKG": "LKG",
  "UKG": "UKG",
  "1ST": "1st Grade",
  "1ST GRADE": "1st Grade",
  "2ND": "2nd Grade",
  "2ND GRADE": "2nd Grade",
  "3RD": "3rd Grade",
  "3RD GRADE": "3rd Grade",
  "4TH": "4th Grade",
  "4TH GRADE": "4th Grade",
  "5TH": "5th Grade",
  "5TH GRADE": "5th Grade",
  "6TH": "6th Grade",
  "6TH GRADE": "6th Grade",
  "7TH": "7th Grade",
  "7TH GRADE": "7th Grade",
  "8TH": "8th Grade",
  "8TH GRADE": "8th Grade",
  "9TH": "9th Grade",
  "9TH GRADE": "9th Grade",
  "10TH": "10th Grade",
  "10TH GRADE": "10th Grade",
  "PLAY GROUP": "Play Group",
  "DAY CARE": "Day Care"
};

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

function parseNumber(val: string): number {
  if (!val) return 0;
  const num = parseFloat(val.replace(/,/g, "").trim());
  return isNaN(num) ? 0 : num;
}

async function main() {
  console.log("=== STARTING GOOGLE SHEET STUDENT IMPORT ===");

  const csvPath = "C:\\Users\\SriKriations\\.gemini\\antigravity-ide\\brain\\45a92914-49f5-4e4e-88af-2774fe2fa999\\.system_generated\\steps\\1133\\content.md";
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n");

  // Find header line
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Student Name") && lines[i].includes("Parent Name")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.error("Could not find CSV header row!");
    return;
  }

  console.log(`Found header at line ${headerIndex + 1}`);

  // Fetch existing classes
  const existingClasses = await prisma.class.findMany({
    where: { schoolId: SCHOOL_ID }
  });
  const classMapByNormalizedName = new Map<string, string>();
  for (const c of existingClasses) {
    classMapByNormalizedName.set(c.name.toUpperCase().trim(), c.id);
  }

  // Fetch existing students in database for deduplication
  const existingStudents = await prisma.student.findMany({
    where: { schoolId: SCHOOL_ID },
    include: { family: true }
  });

  const existingAdmNumbers = new Set<string>();
  const existingNamePhoneKeys = new Set<string>();

  for (const st of existingStudents) {
    if (st.admissionNumber) {
      existingAdmNumbers.add(st.admissionNumber.toUpperCase().trim());
    }
    const nameKey = `${st.firstName.toUpperCase().trim()}_${st.lastName?.toUpperCase().trim() || ""}`;
    const phone = st.family?.fatherPhone ? cleanPhone(st.family.fatherPhone) : "";
    if (nameKey && phone) {
      existingNamePhoneKeys.add(`${nameKey}_${phone}`);
    }
  }

  console.log(`Loaded ${existingStudents.length} existing DB students.`);

  let totalRows = 0;
  let importedCount = 0;
  let skippedDuplicateCount = 0;
  let errorCount = 0;

  const seenInSheetAdmNumbers = new Set<string>();

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith("---") || rawLine.startsWith("Title:") || rawLine.startsWith("Source:")) continue;

    const cols = parseCSVLine(rawLine);
    if (cols.length < 5) continue;

    totalRows++;

    const admNo = cols[0]?.toUpperCase().trim() || "";
    const studentName = cols[1]?.toUpperCase().trim() || "";
    const parentName = cols[2]?.toUpperCase().trim() || "";
    const contactRaw = cols[3] || "";
    const branchCode = cols[4]?.toUpperCase().trim() || "RCB";
    const classNameRaw = cols[5]?.toUpperCase().trim() || "";
    const stopName = cols[6] || "";
    const concession = parseNumber(cols[8]);
    const tuitionFee = parseNumber(cols[9]);
    const transportFee = parseNumber(cols[10]);
    const admissionFee = parseNumber(cols[11]);

    if (!studentName || studentName === "STUDENT NAME") continue;

    const phone = cleanPhone(contactRaw);
    const branchId = BRANCH_CODE_MAP[branchCode] || "VIVES-RCB";

    // Deduplication check
    const isAdmDuplicate = admNo && (existingAdmNumbers.has(admNo) || seenInSheetAdmNumbers.has(admNo));
    const nameKey = `${studentName}_${phone || ""}`;
    const isNamePhoneDuplicate = phone && existingNamePhoneKeys.has(nameKey);

    if (isAdmDuplicate || isNamePhoneDuplicate) {
      skippedDuplicateCount++;
      continue;
    }

    if (admNo) seenInSheetAdmNumbers.add(admNo);

    // Resolve class ID
    const stdMappedName = CLASS_NAME_MAP[classNameRaw] || classNameRaw;
    const classId = classMapByNormalizedName.get(stdMappedName.toUpperCase()) || existingClasses[0]?.id;

    // Split name
    const nameParts = studentName.split(" ");
    const firstName = nameParts[0] || studentName;
    const lastName = nameParts.slice(1).join(" ") || "";

    try {
      const netPayable = (tuitionFee + transportFee + admissionFee) - concession;

      // Create Student Record with relations
      await prisma.student.create({
        data: {
          school: { connect: { id: SCHOOL_ID } },
          branch: { connect: { id: branchId } },
          admissionNumber: admNo || `ADM-${Date.now()}-${totalRows}`,
          firstName,
          lastName,
          status: "ACTIVE",
          family: {
            create: {
              fatherName: parentName,
              fatherPhone: phone || "9999999999",
              school: { connect: { id: SCHOOL_ID } },
              branch: { connect: { id: branchId } }
            }
          },
          academic: classId ? {
            create: {
              academicYear: "2026-2027",
              rollNumber: `${totalRows}`,
              class: { connect: { id: classId } },
              school: { connect: { id: SCHOOL_ID } },
              branch: { connect: { id: branchId } }
            }
          } : undefined,
          financial: {
            create: {
              annualTuition: tuitionFee,
              tuitionFee: tuitionFee,
              totalDiscount: concession,
              netTuition: Math.max(0, tuitionFee - concession),
              admissionFee: admissionFee,
              transportFee: transportFee,
              school: { connect: { id: SCHOOL_ID } },
              branch: { connect: { id: branchId } }
            }
          }
        }
      });

      // Track in existing sets
      if (admNo) existingAdmNumbers.add(admNo);
      if (phone) existingNamePhoneKeys.add(nameKey);

      importedCount++;
      if (importedCount % 50 === 0) {
        console.log(`Progress: Successfully imported ${importedCount} students...`);
      }
    } catch (err: any) {
      console.error(`Error importing row ${i + 1} (${studentName}):`, err.message);
      errorCount++;
    }
  }

  console.log("=== FINAL IMPORT SUMMARY ===");
  console.log(`Total Sheet Rows Processed: ${totalRows}`);
  console.log(`Successfully Imported (New Unique Students): ${importedCount}`);
  console.log(`Skipped Duplicates (Already in DB/Sheet): ${skippedDuplicateCount}`);
  console.log(`Errors Encountered: ${errorCount}`);
}

main().catch(console.error);
