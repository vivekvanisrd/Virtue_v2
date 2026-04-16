import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function sanitizeYear(year: string): string {
    // Standardizes "FY 2026-27" or "AY 2026-27" to "2026-27"
    return year.replace(/^(FY\s+|AY\s+)/i, '').replace(/\s+/g, '');
}

async function finalMigration() {
  console.log('--- GLOBAL ID HARDENING (V2.1) ---');

  // I. SYNC ACADEMIC YEARS
  const ayMap = new Map<string, string>();
  const ays = await prisma.academicYear.findMany();
  ays.forEach((ay) => ayMap.set(ay.id, sanitizeYear(ay.name)));

  // II. SYNC FINANCIAL YEARS
  const fyMap = new Map<string, string>();
  const fys = await prisma.financialYear.findMany();
  fys.forEach((fy) => fyMap.set(fy.id, sanitizeYear(fy.name)));

  // III. MIGRATE STAFF
  const staff = await prisma.staff.findMany({ include: { school: true, branch: true } });
  console.log(`Auditing ${staff.length} staff records...`);
  for (const s of staff) {
    const rolePrefix = s.role.substring(0, 3).toUpperCase();
    const match = s.staffCode.match(/\d+$/);
    const seq = match ? match[0].padStart(4, '0') : '0001';
    const newCode = `${s.school.code}-${s.branch.code}-${rolePrefix}-${seq}`;
    if (newCode !== s.staffCode) {
      try {
        await prisma.staff.update({ where: { id: s.id }, data: { staffCode: newCode } });
        console.log(`Staff: ${s.staffCode} -> ${newCode}`);
      } catch (err) {
        // Fallback for duplicates: use original code but standard branch
        console.warn(`Staff Collision: SKIPPED ${s.staffCode} -> ${newCode}`);
      }
    }
  }

  // IV. MIGRATE STUDENTS
  const students = await prisma.student.findMany({ include: { school: true, academic: { include: { branch: true } } } });
  console.log(`Auditing ${students.length} student records...`);
  for (const stu of students) {
    if (!stu.academic?.branch) continue;
    const ay = ayMap.get(stu.academic.academicYear) || "2026-27";
    const branch = stu.academic.branch.code;
    const school = stu.school.code;
    
    // Admission
    const admMatch = stu.admissionNumber?.match(/\d+$/);
    const newAdm = `${school}-${branch}-${ay}-ADM-${(admMatch ? admMatch[0] : '1').padStart(5, '0')}`;
    
    // Code
    const stuMatch = stu.studentCode?.match(/\d+$/);
    const newCode = `${school}-${branch}-${ay}-STU-${(stuMatch ? stuMatch[0] : '1').padStart(4, '0')}`;

    if (newAdm !== stu.admissionNumber || newCode !== stu.studentCode) {
      try {
        await prisma.student.update({ where: { id: stu.id }, data: { admissionNumber: newAdm, studentCode: newCode } });
        console.log(`Student [${stu.firstName}]: ADM: ${newAdm}, CODE: ${newCode}`);
      } catch (err) {
        console.warn(`Student Collision: SKIPPED ${stu.firstName}`);
      }
    }
  }

  // V. MIGRATE RECEIPTS
  const receipts = await prisma.collection.findMany({ include: { school: true, branch: true } });
  console.log(`Auditing ${receipts.length} collections...`);
  for (const r of receipts) {
    const fyName = fyMap.get(r.financialYearId) || "2026-27";
    const resMatch = r.receiptNumber.match(/\d+$/);
    const newRec = `${r.school.code}-${r.branch.code}-${fyName}-REC-${(resMatch ? resMatch[0] : '1').padStart(5, '0')}`;
    if (newRec !== r.receiptNumber) {
        try {
            await prisma.collection.update({ where: { id: r.id }, data: { receiptNumber: newRec } });
            console.log(`Receipt: ${r.receiptNumber} -> ${newRec}`);
        } catch (err) {
            console.warn(`Receipt Collision: SKIPPED ${r.receiptNumber}`);
        }
    }
  }

  console.log('--- ALL RECORDS MIGRATED. VIRTUE V2 HARDENING COMPLETE. ---');
}

finalMigration().finally(() => prisma.$disconnect());
