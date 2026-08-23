import { prismaBypass as prisma } from "../src/lib/prisma";

const SCHOOL_ID = "VIVES";

async function main() {
  console.log("=== IMPORTING THE 2 EDGE-CASE SHEET ROWS ===");

  const class4th = await prisma.class.findFirst({ where: { schoolId: SCHOOL_ID, name: { contains: "4th", mode: "insensitive" } } });
  const class7th = await prisma.class.findFirst({ where: { schoolId: SCHOOL_ID, name: { contains: "7th", mode: "insensitive" } } });

  // 1. M.HARSHAVARDHAN REDDY
  try {
    await prisma.student.create({
      data: {
        school: { connect: { id: SCHOOL_ID } },
        branch: { connect: { id: "VIVES-RCB" } },
        admissionNumber: "ADM-EDGE-567",
        firstName: "M.HARSHAVARDHAN",
        lastName: "REDDY",
        status: "ACTIVE",
        family: {
          create: {
            fatherName: "M.SHIVAHANKAR REDDY",
            fatherPhone: "9993686420",
            school: { connect: { id: SCHOOL_ID } },
            branch: { connect: { id: "VIVES-RCB" } }
          }
        },
        academic: class4th ? {
          create: {
            academicYear: "2026-2027",
            class: { connect: { id: class4th.id } },
            school: { connect: { id: SCHOOL_ID } },
            branch: { connect: { id: "VIVES-RCB" } }
          }
        } : undefined,
        financial: {
          create: {
            annualTuition: 35500,
            tuitionFee: 35500,
            totalDiscount: 0,
            netTuition: 35500,
            admissionFee: 0,
            transportFee: 0,
            school: { connect: { id: SCHOOL_ID } },
            branch: { connect: { id: "VIVES-RCB" } }
          }
        }
      }
    });
    console.log("Imported M.HARSHAVARDHAN REDDY successfully.");
  } catch (err: any) {
    console.error("Error importing 567:", err.message);
  }

  // 2. K.VAIBHAV GOUD
  try {
    await prisma.student.create({
      data: {
        school: { connect: { id: SCHOOL_ID } },
        branch: { connect: { id: "VIVES-RCB" } },
        admissionNumber: "ADM-EDGE-670",
        firstName: "K.VAIBHAV",
        lastName: "GOUD",
        status: "ACTIVE",
        family: {
          create: {
            fatherName: "RAVINDER GOUD",
            fatherPhone: "9999999999",
            school: { connect: { id: SCHOOL_ID } },
            branch: { connect: { id: "VIVES-RCB" } }
          }
        },
        academic: class7th ? {
          create: {
            academicYear: "2026-2027",
            class: { connect: { id: class7th.id } },
            school: { connect: { id: SCHOOL_ID } },
            branch: { connect: { id: "VIVES-RCB" } }
          }
        } : undefined,
        financial: {
          create: {
            annualTuition: 38500,
            tuitionFee: 38500,
            totalDiscount: 0,
            netTuition: 38500,
            admissionFee: 0,
            transportFee: 0,
            school: { connect: { id: SCHOOL_ID } },
            branch: { connect: { id: "VIVES-RCB" } }
          }
        }
      }
    });
    console.log("Imported K.VAIBHAV GOUD successfully.");
  } catch (err: any) {
    console.error("Error importing 670:", err.message);
  }
}

main().catch(console.error);
