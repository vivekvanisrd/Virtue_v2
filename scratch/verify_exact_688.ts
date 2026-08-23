import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import * as fs from "fs";
const fileContent = fs.readFileSync("scratch/sync_and_replace_pasted_data.ts", "utf-8");
const match = fileContent.match(/const rawPastedText = `([\s\S]*?)`;/);
const PASTED_TEXT = match ? match[1] : "";

async function main() {
  const lines = PASTED_TEXT.split(/\r?\n/).filter(l => l.trim().length > 0);

  const pastedMap = new Map<string, any>();

  for (const line of lines) {
    const parts = line.split("\t").map(p => p.trim());
    if (parts.length >= 7) {
      const col0 = parts[0] || "";
      if (col0.startsWith("S.No") || col0.includes("Student Name") || col0 === "Status") continue;

      let tempId = "", studentName = "", parentName = "", contact = "", branch = "", className = "";
      let tuitionFee = 0, concession = 0, transportFee = 0, admFee = 0, totalDue = 0;

      if (parts.length >= 12) {
        tempId = parts[0];
        studentName = parts[1];
        parentName = parts[2];
        contact = parts[3];
        branch = parts[4];
        className = parts[5];
        admFee = parseFloat(parts[7]) || 0;
        concession = parseFloat(parts[8]) || 0;
        tuitionFee = parseFloat(parts[9]) || 0;
        transportFee = parseFloat(parts[10]) || 0;
        totalDue = parseFloat(parts[11]) || 0;
      } else {
        studentName = parts[0];
        parentName = parts[1];
        contact = parts[2];
        branch = parts[3];
        className = parts[4];
      }

      if (!studentName || studentName === "Student Name") continue;

      const normName = studentName.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const normClass = className.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const normPhone = contact.replace(/\D/g, "");
      const key = `${normName}_${normClass}_${normPhone || parentName.toUpperCase()}`;

      if (!pastedMap.has(key)) {
        pastedMap.set(key, { tempId, studentName, parentName, contact, branch, className, tuitionFee, concession, transportFee, admFee, totalDue });
      }
    }
  }

  console.log(`Total Unique Pasted Master Table Students parsed: ${pastedMap.size}`);

  const dbStudents = await prisma.student.findMany({
    where: { branchId: "VIVES-RCB" },
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      phone: true
    }
  });

  let matchedCount = 0;
  let missingCount = 0;

  for (const [key, p] of pastedMap.entries()) {
    const pNameNorm = p.studentName.replace(/[^A-Z0-9]/gi, "").toUpperCase();

    const dbMatch = dbStudents.find(s => {
      const dbNameNorm = `${s.firstName || ""}${s.lastName || ""}`.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      return dbNameNorm === pNameNorm || dbNameNorm.includes(pNameNorm) || pNameNorm.includes(dbNameNorm);
    });

    if (dbMatch) {
      matchedCount++;
    } else {
      missingCount++;
      console.log(`Missing in DB: ${p.tempId} | ${p.studentName} | ${p.className} | ${p.parentName}`);
    }
  }

  console.log(`\n=== VERIFICATION RESULT ===`);
  console.log(`Total Unique Pasted Students: ${pastedMap.size}`);
  console.log(`Matched & Present in ERP DB: ${matchedCount}`);
  console.log(`Missing: ${missingCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
