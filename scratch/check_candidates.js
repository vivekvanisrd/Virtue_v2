const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeAdm(adm) {
  if (!adm) return "";
  let s = adm.toString().toUpperCase().trim();
  // Remove academic year suffix (e.g. -26, -25, -2026, -26-27)
  s = s.replace(/-2[56](-\d+)?$/, "");
  s = s.replace(/-FY\d+$/, "");
  // Replace letter O with number 0 if it's followed by numbers
  // E.g. VRO1257 -> VR01257
  s = s.replace(/^VR[O0]/, "VR0");
  s = s.replace(/^VS[O0]/, "VS0");
  s = s.replace(/^VM[O0]/, "VM0");
  s = s.replace(/^VK[O0]/, "VK0");
  s = s.replace(/[^A-Z0-9]/g, "");
  return s;
}

function normalizeName(name) {
  if (!name) return "";
  return name.toString().toUpperCase()
    .replace(/[\s\.\-]+/g, "") // remove spaces, dots, dashes
    .trim();
}

async function run() {
  const filePath = "C:\\Users\\SriKriations\\Favorites\\Downloads\\test of accounts (1).xlsx";
  const workbook = XLSX.readFile(filePath);
  const excelStudents = XLSX.utils.sheet_to_json(workbook.Sheets['STUDENT_MASTER'], { defval: '' })
    .filter(s => s['Student Name'] && s['Student Name'].toString().trim() !== '');

  const dbStudents = await prisma.student.findMany({
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      branchId: true,
      schoolId: true
    }
  });

  console.log(`Excel active students: ${excelStudents.length}`);
  console.log(`DB students: ${dbStudents.length}`);

  let matchCount = 0;
  const matches = [];
  const unmatched = [];

  excelStudents.forEach(es => {
    const normEsAdm = normalizeAdm(es['Admi No']);
    const normEsName = normalizeName(es['Student Name']);

    let matchedDb = null;
    let matchReason = "";

    // 1. Try exact normalized Admission Number
    if (normEsAdm) {
      matchedDb = dbStudents.find(ds => normalizeAdm(ds.admissionNumber) === normEsAdm);
      if (matchedDb) matchReason = "Normalized Admission Number";
    }

    // 2. Try normalized name match
    if (!matchedDb && normEsName) {
      matchedDb = dbStudents.find(ds => {
        const dbName = normalizeName(`${ds.firstName || ""} ${ds.lastName || ""}`);
        return dbName === normEsName;
      });
      if (matchedDb) matchReason = "Normalized Name";
    }

    // 3. Try initials-expanded name match (e.g. G.SAANVIKA vs GADILA SAANVIKA)
    if (!matchedDb && normEsName) {
      matchedDb = dbStudents.find(ds => {
        const dbName = `${ds.firstName || ""} ${ds.lastName || ""}`.toUpperCase();
        const esName = es['Student Name'].toString().toUpperCase();
        
        // E.g. Check if "G.SAANVIKA" is GADILA SAANVIKA
        // G. -> GADILA
        const esParts = esName.split(/[\s\.]+/).filter(Boolean);
        const dbParts = dbName.split(/[\s\.]+/).filter(Boolean);
        
        if (esParts.length === 2 && dbParts.length === 2) {
          const esFirst = esParts[0];
          const esLast = esParts[1];
          const dbFirst = dbParts[0];
          const dbLast = dbParts[1];
          
          // Case 1: Initial first name, matching last name
          // E.g., G. SAANVIKA vs GADILA SAANVIKA
          if (esFirst.length === 1 && dbFirst.startsWith(esFirst) && esLast === dbLast) {
            return true;
          }
          // Case 2: Initial last name, matching first name
          if (esLast.length === 1 && dbLast.startsWith(esLast) && esFirst === dbFirst) {
            return true;
          }
        }
        return false;
      });
      if (matchedDb) matchReason = "Name with Initial Expansion";
    }

    if (matchedDb) {
      matchCount++;
      matches.push({ excel: es, db: matchedDb, reason: matchReason });
    } else {
      unmatched.push(es);
    }
  });

  console.log(`\nNormalized Matching Results:`);
  console.log(`Matched: ${matchCount} / ${excelStudents.length}`);
  console.log(`Unmatched: ${unmatched.length} / ${excelStudents.length}`);

  console.log(`\nMatched Students List:`);
  matches.forEach((m, idx) => {
    console.log(`${idx + 1}. Excel: "${m.excel['Student Name']}" (${m.excel['Admi No']}) -> DB: "${m.db.firstName} ${m.db.lastName}" (${m.db.admissionNumber}) [Reason: ${m.reason}]`);
  });

  if (unmatched.length > 0) {
    console.log(`\nUnmatched Students List:`);
    unmatched.forEach((u, idx) => {
      console.log(`${idx + 1}. Excel: "${u['Student Name']}" (${u['Admi No']}) Class: "${u['Class']}" Branch: "${u['Branch']}"`);
    });
  }

  await prisma.$disconnect();
}
run();
