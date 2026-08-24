import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Scanning ENTIRE database for Similar Student Names & Same Father Name/Phone...\n");

  const students = await prisma.student.findMany({
    where: { branchId: "VIVES-RCB" },
    include: {
      family: true,
      academic: { include: { class: true } },
      collections: true
    }
  });

  // Group by Father Phone
  const phoneGroupMap = new Map<string, typeof students>();
  // Group by Father Name
  const fatherNameGroupMap = new Map<string, typeof students>();

  students.forEach(s => {
    const fPhone = s.family?.fatherPhone?.trim() || "";
    const fName = s.family?.fatherName?.trim().toLowerCase() || "";

    if (fPhone && fPhone.length >= 10 && fPhone !== "null") {
      if (!phoneGroupMap.has(fPhone)) phoneGroupMap.set(fPhone, []);
      phoneGroupMap.get(fPhone)!.push(s);
    }

    if (fName && fName.length > 3 && fName !== "null") {
      if (!fatherNameGroupMap.has(fName)) fatherNameGroupMap.set(fName, []);
      fatherNameGroupMap.get(fName)!.push(s);
    }
  });

  console.log(`📌 Found ${phoneGroupMap.size} unique father phone groups.`);

  let potentialDuplicates: any[] = [];
  let validSiblingGroups: any[] = [];

  phoneGroupMap.forEach((group, phone) => {
    if (group.length > 1) {
      // Check if student names are identical or very similar
      const nameSet = new Set(group.map(s => s.firstName.trim().toLowerCase()));
      
      if (nameSet.size < group.length) {
        // True duplicate candidate (same name + same phone)
        potentialDuplicates.push({ phone, group });
      } else {
        // Sibling candidate (different student names + same father/phone)
        validSiblingGroups.push({ phone, group });
      }
    }
  });

  console.log(`\n🚨 POTENTIAL DUPLICATE PROFILES (Same Student Name + Same Father Phone): ${potentialDuplicates.length}`);
  potentialDuplicates.forEach((item, idx) => {
    console.log(`\n[Duplicate Pair #${idx + 1}] Father Phone: ${item.phone}`);
    item.group.forEach((s: any) => {
      console.log(`  - Student: "${s.firstName} ${s.lastName || ''}" (ID: ${s.id}, AdmNo: ${s.admissionNumber})`);
      console.log(`    Class: ${s.academic?.class?.name || 'N/A'}, Father: "${s.family?.fatherName}"`);
      console.log(`    Collections (${s.collections.length}): ${s.collections.map((c: any) => `₹${c.totalPaid || c.amountPaid}`).join(", ") || "Zero Receipts"}`);
    });
  });

  console.log(`\n👨‍👩‍👧‍👦 VALID SIBLING GROUPS (Different Student Names + Same Father Phone): ${validSiblingGroups.length}`);
  validSiblingGroups.slice(0, 10).forEach((item, idx) => {
    console.log(`\n[Sibling Group #${idx + 1}] Father Phone: ${item.phone}, Father: "${item.group[0]?.family?.fatherName}"`);
    item.group.forEach((s: any) => {
      console.log(`  - Student: "${s.firstName} ${s.lastName || ''}" (${s.academic?.class?.name || 'N/A'}, AdmNo: ${s.admissionNumber})`);
    });
  });

  console.log("\n✅ Audit Complete!");
}

main().finally(() => prisma.$disconnect());
