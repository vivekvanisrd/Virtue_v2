import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SCHOOL_ID = "VIVES";
const BRANCH_ID = "VIVES-RCB";

const missingList = [
  { tempId: "VR0037-26", name: "CH.VIHANKRISH", parent: "M.RAGHU", contact: "9959819698", className: "NUR", tuitionFee: 25500, concession: 0, transportFee: 0, admFee: 1000, totalDue: 26500 },
  { tempId: "VRO1320", name: "P.AGASTYA", parent: "P.RAM REDDY", contact: "9849208000", className: "UKG", tuitionFee: 27500, concession: 0, transportFee: 0, admFee: 1000, totalDue: 28500 },
  { tempId: "VM0593", name: "C.VISHWAK REDDY", parent: "CHAKRADHAR REDDY", contact: "9989012345", className: "3RD", tuitionFee: 35500, concession: 0, transportFee: 0, admFee: 0, totalDue: 35500 },
  { tempId: "VR0806", name: "S.SHANVI SRI", parent: "SUBHASH", contact: "9949123456", className: "5TH", tuitionFee: 37500, concession: 0, transportFee: 0, admFee: 0, totalDue: 37500 },
  { tempId: "VR0820", name: "R.AADVIKA", parent: "R.VENKATESH GOUD", contact: "9885123456", className: "8TH", tuitionFee: 38500, concession: 0, transportFee: 0, admFee: 0, totalDue: 38500 }
];

async function main() {
  const classes = await prisma.class.findMany({ where: { schoolId: SCHOOL_ID } });

  for (const item of missingList) {
    const cls = classes.find(c => c.name.toUpperCase().trim() === item.className.toUpperCase().trim()) || classes[0];

    // Check if student exists by admission number or phone
    const existing = await prisma.student.findFirst({
      where: {
        branchId: BRANCH_ID,
        OR: [
          { admissionNumber: item.tempId },
          { phone: item.contact }
        ]
      }
    });

    if (existing) {
      console.log(`Updating existing match for ${item.tempId} (${existing.id})`);
      await prisma.student.update({
        where: { id: existing.id },
        data: {
          firstName: item.name,
          phone: item.contact,
          status: "ACTIVE"
        }
      });
    } else {
      console.log(`Creating missing student for ${item.tempId} - ${item.name}`);
      const newStu = await prisma.student.create({
        data: {
          schoolId: SCHOOL_ID,
          branchId: BRANCH_ID,
          admissionNumber: item.tempId,
          firstName: item.name,
          phone: item.contact,
          status: "ACTIVE",
          academic: {
            create: {
              schoolId: SCHOOL_ID,
              branchId: BRANCH_ID,
              classId: cls.id,
              academicYear: "2026-2027"
            }
          },
          financial: {
            create: {
              schoolId: SCHOOL_ID,
              branchId: BRANCH_ID,
              totalNetDue: item.totalDue
            }
          }
        }
      });
      console.log(`Created student ID: ${newStu.id}`);
    }
  }

  console.log("=== COMPLETED CREATING/UPDATING REMAINING 5 STUDENTS ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
