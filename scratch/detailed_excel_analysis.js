const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAnalysis() {
  const filePath = "C:\\Users\\SriKriations\\Favorites\\Downloads\\test of accounts (1).xlsx";
  console.log("Reading workbook...");
  try {
    const workbook = XLSX.readFile(filePath);
    const excelStudents = XLSX.utils.sheet_to_json(workbook.Sheets["STUDENT_MASTER"], { defval: "" });
    console.log(`Excel Students count: ${excelStudents.length}`);

    // Let's summarize Excel admission number prefixes
    const prefixes = {};
    excelStudents.forEach(s => {
      const adm = (s["Admi No"] || "").toString().trim();
      let prefix = "EMPTY";
      if (adm) {
        const match = adm.match(/^([A-Za-z]+)/);
        prefix = match ? match[1].toUpperCase() : "NUMERIC_ONLY";
      }
      prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    });
    console.log("\nExcel Admission Number Prefixes:", prefixes);

    // Let's print some sample Excel admission numbers and names
    console.log("\nSample of Excel Students (first 15):");
    const samples = excelStudents.slice(0, 15).map(s => ({
      "Admi No": s["Admi No"],
      "Student Name": s["Student Name"],
      "Parent Name": s["Parent Name"],
      "Class": s["Class"],
      "Branch": s["Branch"]
    }));
    console.log(JSON.stringify(samples, null, 2));

    // Fetch all DB students
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
    console.log(`\nDB Students count: ${dbStudents.length}`);

    const dbPrefixes = {};
    dbStudents.forEach(s => {
      const adm = (s.admissionNumber || "").trim();
      let prefix = "EMPTY";
      if (adm) {
        const match = adm.match(/^([A-Za-z]+)/);
        prefix = match ? match[1].toUpperCase() : "NUMERIC_ONLY";
      }
      dbPrefixes[prefix] = (dbPrefixes[prefix] || 0) + 1;
    });
    console.log("DB Admission Number Prefixes:", dbPrefixes);

    console.log("\nSample of DB Students (first 15):");
    const dbSamples = dbStudents.slice(0, 15).map(s => ({
      admissionNumber: s.admissionNumber,
      firstName: s.firstName,
      lastName: s.lastName,
      fullName: `${s.firstName || ""} ${s.lastName || ""}`.trim()
    }));
    console.log(JSON.stringify(dbSamples, null, 2));

    // Let's search for case-insensitive substrings or fuzzy name overlap
    let fuzzyMatches = 0;
    const fuzzyMatchSamples = [];

    for (const es of excelStudents) {
      const esName = (es["Student Name"] || "").toString().toUpperCase().replace(/[\s\.\-]+/g, '').trim();
      if (!esName) continue;

      for (const dbStudent of dbStudents) {
        const dbFullName = `${dbStudent.firstName || ""} ${dbStudent.lastName || ""}`.toUpperCase().replace(/[\s\.\-]+/g, '').trim();
        
        if (dbFullName && (esName === dbFullName || esName.includes(dbFullName) || dbFullName.includes(esName))) {
          fuzzyMatches++;
          if (fuzzyMatchSamples.length < 20) {
            fuzzyMatchSamples.push({
              excelName: es["Student Name"],
              excelAdm: es["Admi No"],
              dbFullName: `${dbStudent.firstName || ""} ${dbStudent.lastName || ""}`.trim(),
              dbAdm: dbStudent.admissionNumber
            });
          }
          break; // move to next excel student
        }
      }
    }

    console.log(`\nFuzzy/Normalized Name Matches found: ${fuzzyMatches}`);
    if (fuzzyMatchSamples.length > 0) {
      console.log("Sample of fuzzy matches:", JSON.stringify(fuzzyMatchSamples, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

runAnalysis();
