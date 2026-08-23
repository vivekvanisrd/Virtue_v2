import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import * as fs from "fs";
const fileContent = fs.readFileSync("scratch/sync_and_replace_pasted_data.ts", "utf-8");
const match = fileContent.match(/const rawPastedText = `([\s\S]*?)`;/);
const PASTED_TEXT = match ? match[1] : "";

async function main() {
  const lines = PASTED_TEXT.split(/\r?\n/).filter(l => l.trim().length > 0);

  const pastedStudents: any[] = [];
  const seenKeys = new Set<string>();

  for (const line of lines) {
    const parts = line.split("\t").map(p => p.trim());
    if (parts.length >= 12 && parts[0] !== "S.No" && parts[0] !== "TEMP") {
      const tempId = parts[0];
      const name = parts[1];
      const parent = parts[2];
      const phone = parts[3];
      const className = parts[5];
      const stopName = parts[6];
      const admFee = parseFloat(parts[7]) || 0;
      const concession = parseFloat(parts[8]) || 0;
      const tuitionFee = parseFloat(parts[9]) || 0;
      const transportFee = parseFloat(parts[10]) || 0;
      const totalDue = parseFloat(parts[11]) || 0;

      const key = `${name.toUpperCase()}_${className.toUpperCase()}_${phone.replace(/\D/g, "") || parent.toUpperCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        pastedStudents.push({ tempId, name, parent, phone, className, stopName, admFee, concession, tuitionFee, transportFee, totalDue });
      }
    }
  }

  console.log(`Total Unique Pasted Master Table Students: ${pastedStudents.length}`);

  const dbStudents = await prisma.student.findMany({
    where: { branchId: "VIVES-RCB" },
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      status: true
    }
  });

  let verifiedCount = 0;
  let unverifiedCount = 0;

  for (const p of pastedStudents) {
    const pName = p.name.trim().toUpperCase();

    const matchStudent = dbStudents.find(s => {
      const dbName = `${s.firstName || ""} ${s.lastName || ""}`.trim().toUpperCase();
      return dbName === pName || dbName.includes(pName) || pName.includes(dbName);
    });

    if (matchStudent) {
      verifiedCount++;
    } else {
      unverifiedCount++;
      console.log(`Unverified: ${p.tempId} ${p.name} (${p.className})`);
    }
  }

  console.log(`\n=== FINAL SYNCHRONIZATION AUDIT ===`);
  console.log(`Total Unique Students in Pasted Master Table: ${pastedStudents.length}`);
  console.log(`Successfully Verified in ERP Database: ${verifiedCount}`);
  console.log(`Missing / Unverified: ${unverifiedCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
