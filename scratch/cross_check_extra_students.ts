import fs from "fs";
import { prismaBypass as prisma } from "../src/lib/prisma";

const SCHOOL_ID = "VIVES";

// read the generated JSON
const auditData = JSON.parse(fs.readFileSync("scratch/duplicates_and_extras_audit.json", "utf-8"));

async function main() {
  console.log("=== CROSS-CHECKING EXTRA DB STUDENTS FOR NAME / PHONE MATCHES ===");

  // Load all ERP DB students for VIVES
  const dbStudents = await prisma.student.findMany({
    where: { schoolId: SCHOOL_ID },
    include: {
      family: true,
      academic: { include: { class: true } },
      branch: true
    }
  });

  const extraList: any[] = auditData.extraDbStudentsList;

  function cleanString(str: string | null | undefined): string {
    if (!str) return "";
    return str.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function cleanPhone(str: string | null | undefined): string {
    if (!str) return "";
    const d = str.replace(/\D/g, "");
    return d.length >= 10 ? d.slice(-10) : d;
  }

  // Get list of all pasted student names, parent names, and phones
  // From our earlier script, we have rawPastedText or we can query all DB students matched by pasted text
  const extraIds = new Set(extraList.map(e => e.id));
  const pastedDbStudents = dbStudents.filter(s => !extraIds.has(s.id));

  console.log(`Pasted DB Students Count: ${pastedDbStudents.length}`);
  console.log(`Extra DB Students Count: ${extraList.length}`);

  const matchesFound: any[] = [];

  for (const extra of extraList) {
    const extraNameClean = cleanString(extra.studentName);
    const extraParentClean = cleanString(extra.parentName);
    const extraPhone = cleanPhone(extra.phone);

    const matchesForThisExtra: any[] = [];

    for (const p of pastedDbStudents) {
      const pFullName = `${p.firstName} ${p.lastName || ""}`.trim();
      const pNameClean = cleanString(pFullName);
      const pParentClean = cleanString(p.family?.fatherName);
      const pPhone = cleanPhone(p.family?.fatherPhone);

      let isPhoneMatch = false;
      let isNameMatch = false;
      let isPartialNameMatch = false;

      // Phone match (ignoring dummy phones)
      if (extraPhone && extraPhone.length >= 8 && !extraPhone.startsWith("000") && !extraPhone.startsWith("999999")) {
        if (pPhone === extraPhone) {
          isPhoneMatch = true;
        }
      }

      // Name match
      if (extraNameClean.length >= 3 && pNameClean.length >= 3) {
        if (extraNameClean === pNameClean) {
          isNameMatch = true;
        } else if (extraNameClean.includes(pNameClean) || pNameClean.includes(extraNameClean)) {
          isPartialNameMatch = true;
        }
      }

      if (isPhoneMatch || isNameMatch || (isPartialNameMatch && (extraParentClean === pParentClean || pPhone === extraPhone))) {
        matchesForThisExtra.push({
          matchedPastedStudentId: p.id,
          matchedPastedAdmissionNo: p.admissionNumber,
          matchedPastedName: pFullName,
          matchedPastedParent: p.family?.fatherName,
          matchedPastedPhone: p.family?.fatherPhone,
          matchedPastedClass: p.academic?.class?.name,
          matchReasons: {
            isPhoneMatch,
            isNameMatch,
            isPartialNameMatch
          }
        });
      }
    }

    matchesFound.push({
      extraStudent: extra,
      matchedCount: matchesForThisExtra.length,
      matches: matchesForThisExtra
    });
  }

  console.log("=== CROSS-CHECK MATCH RESULTS ===");
  console.log(JSON.stringify(matchesFound, null, 2));

  fs.writeFileSync("scratch/extra_students_cross_check_results.json", JSON.stringify(matchesFound, null, 2));
}

main().catch(console.error);
