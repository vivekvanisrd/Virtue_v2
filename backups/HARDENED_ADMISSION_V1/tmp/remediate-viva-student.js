const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function getNextSequence(params, tx) {
    const p = tx || prisma;
    const branchId = params.branchId || "GLOBAL";
    const counter = await p.tenancyCounter.upsert({
      where: {
        schoolId_branchId_type_year: {
          schoolId: params.schoolId,
          branchId,
          type: params.type,
          year: params.year
        }
      },
      update: {
        lastValue: { increment: 1 }
      },
      create: {
        schoolId: params.schoolId,
        branchId,
        type: params.type,
        year: params.year,
        lastValue: 1
      }
    });

    return counter.lastValue;
}

async function main() {
  try {
    const student = await prisma.student.findFirst({
      where: {
        firstName: { contains: "Studen1" },
        lastName: { contains: "Success" },
        status: "Provisional"
      }
    });

    if (!student) {
      console.log("❌ Student 'Studen1 Success' not found in Provisional status.");
      return;
    }

    console.log(`🔗 Found Student: ${student.firstName} ${student.lastName} (${student.id})`);
    
    const schoolId = student.schoolId;
    const branchId = student.branchId || "VIVA-BR-01";

    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { code: true } });
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { code: true } });

    const activeAY = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { name: true }
    });

    const yearSuffix = activeAY?.name || new Date().getFullYear().toString();
    const branchCode = branch?.code || "BR01";

    console.log(`🚀 Promoting to School: ${school?.code}, Branch: ${branchCode}, Year: ${yearSuffix}`);

    // 1. Generate Admission Number
    const admSeq = await getNextSequence({
        schoolId,
        branchId,
        type: "ADMISSION",
        year: yearSuffix
    });
    const admissionNumber = `${school.code}-${branchCode}-${yearSuffix}-ADM-${admSeq.toString().padStart(5, '0')}`;

    // 2. Generate Student Code
    const stuSeq = await getNextSequence({
        schoolId,
        branchId,
        type: "STUDENT",
        year: yearSuffix
    });
    const studentCode = `${school.code}-${branchCode}-${yearSuffix}-STU-${stuSeq.toString().padStart(5, '0')}`;

    console.log(`💎 Generated Admission Number: ${admissionNumber}`);
    console.log(`💎 Generated Student Code: ${studentCode}`);

    // 3. Update Record
    await prisma.student.update({
        where: { id: student.id },
        data: {
            status: "Active",
            admissionNumber,
            studentCode
        }
    });

    console.log("✅ Promotion Successful! Student is now ACTIVE in Main DB.");

  } catch (e) {
    console.error("❌ ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
