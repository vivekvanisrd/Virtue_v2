import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Read PASTED_TEXT from sync_and_replace_pasted_data.ts
import * as fs from "fs";
const fileContent = fs.readFileSync("scratch/sync_and_replace_pasted_data.ts", "utf-8");
const match = fileContent.match(/export const PASTED_TEXT = `([\s\S]*?)`;/);
const PASTED_TEXT = match ? match[1] : "";

async function main() {
  const lines = PASTED_TEXT.split(/\r?\n/).filter(l => l.trim().length > 0);

  const pastedMap = new Map<string, any>();
  for (const line of lines) {
    const parts = line.split("\t").map(p => p.trim());
    if (parts.length >= 12 && parts[0] !== "S.No" && parts[0] !== "TEMP") {
      const adm = parts[0];
      const name = parts[1];
      const parent = parts[2];
      const phone = parts[3];
      const className = parts[5];
      const tuitionFee = parseFloat(parts[9]) || 0;
      const totalDue = parseFloat(parts[11]) || 0;

      const key = adm.toUpperCase();
      if (!pastedMap.has(key)) {
        pastedMap.set(key, { adm, name, parent, phone, className, tuitionFee, totalDue });
      }
    }
  }

  const dbStudents = await prisma.student.findMany({
    where: { branchId: "VIVES-RCB" },
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      createdAt: true
    }
  });

  const matchedInDb: any[] = [];
  const extraInDb: any[] = [];

  for (const s of dbStudents) {
    const admKey = (s.admissionNumber || "").trim().toUpperCase();
    if (pastedMap.has(admKey)) {
      matchedInDb.push({ dbId: s.id, adm: s.admissionNumber, name: `${s.firstName} ${s.lastName}`.trim(), status: s.status });
    } else {
      extraInDb.push({ dbId: s.id, adm: s.admissionNumber, name: `${s.firstName} ${s.lastName}`.trim(), phone: s.phone, status: s.status, createdAt: s.createdAt });
    }
  }

  console.log(`=== RECONCILIATION FOR VIVES-RCB ===`);
  console.log(`Pasted Unique Master Students: ${pastedMap.size}`);
  console.log(`Matched DB Students (updated with pasted data): ${matchedInDb.length}`);
  console.log(`Extra DB Students NOT in Pasted Master Table: ${extraInDb.length}`);
  console.log("\nSample Extra DB Students (first 25):");
  console.log(extraInDb.slice(0, 25));
}

main().catch(console.error).finally(() => prisma.$disconnect());
