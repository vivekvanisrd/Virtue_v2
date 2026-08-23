import { prismaBypass as prisma } from "../src/lib/prisma";

const SCHOOL_ID = "VIVES";

const missingStudents = [
  { name: "G.SAANVIKA", parent: "G.SUBHASH", phone: "9491466013", className: "NUR", tuition: 25500 },
  { name: "B.HARSHAVARDHAN", parent: "B.RAVI", phone: "9000559134", className: "1ST", tuition: 33000 },
  { name: "CH.MOKSHITHA", parent: "CH.SRIKANTH", phone: "9705761357", className: "2ND", tuition: 33000 },
  { name: "N.HARI CHANDANA", parent: "N.SRISHAILAM", phone: "9705151164", className: "2ND", tuition: 33000 },
  { name: "C.SAHASRA", parent: "C.MADHU SUDHAN", phone: "9912174413", className: "2ND", tuition: 33000 },
  { name: "M.HARSHAVARDHAN REDDY", parent: "M.SHIVAHANKAR REDDY", phone: "9993686420", className: "4TH", tuition: 35500 },
  { name: "M.VEDANSH", parent: "M.LINGAM", phone: "9948128928", className: "4TH", tuition: 35500 },
  { name: "M.PREKSHA", parent: "M.VIJAY BHASKAR", phone: "9398023070", className: "6TH", tuition: 37500 },
  { name: "K.VAIBHAV GOUD", parent: "RAVINDER GOUD", phone: "9999999999", className: "7TH", tuition: 38500 }
];

async function main() {
  console.log("=== IMPORTING 9 MISSING EDGE-CASE STUDENTS FROM PASTED TAB ===");

  const classes = await prisma.class.findMany({ where: { schoolId: SCHOOL_ID } });

  let count = 0;
  for (const item of missingStudents) {
    const matchedClass = classes.find(c => c.name.toUpperCase().includes(item.className));

    // split first and last name
    const parts = item.name.split(" ");
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");

    try {
      await prisma.student.create({
        data: {
          school: { connect: { id: SCHOOL_ID } },
          branch: { connect: { id: "VIVES-RCB" } },
          admissionNumber: `ADM-PASTED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          firstName,
          lastName: lastName || undefined,
          status: "ACTIVE",
          family: {
            create: {
              fatherName: item.parent,
              fatherPhone: item.phone,
              school: { connect: { id: SCHOOL_ID } },
              branch: { connect: { id: "VIVES-RCB" } }
            }
          },
          academic: matchedClass ? {
            create: {
              academicYear: "2026-2027",
              class: { connect: { id: matchedClass.id } },
              school: { connect: { id: SCHOOL_ID } },
              branch: { connect: { id: "VIVES-RCB" } }
            }
          } : undefined,
          financial: {
            create: {
              annualTuition: item.tuition,
              tuitionFee: item.tuition,
              totalDiscount: 0,
              netTuition: item.tuition,
              admissionFee: 0,
              transportFee: 0,
              school: { connect: { id: SCHOOL_ID } },
              branch: { connect: { id: "VIVES-RCB" } }
            }
          }
        }
      });
      console.log(`Successfully imported ${item.name} (${item.className})`);
      count++;
    } catch (err: any) {
      console.error(`Error importing ${item.name}:`, err.message);
    }
  }

  console.log(`Successfully completed import of ${count} missing students.`);
}

main().catch(console.error);
