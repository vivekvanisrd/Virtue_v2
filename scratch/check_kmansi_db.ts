import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== INSPECTING K.MANSI (VM513) IN DB ===");

  const student = await prisma.student.findFirst({
    where: {
      branchId: BRANCH_ID,
      OR: [
        { admissionNumber: "VM513" },
        { admissionNumber: "VM0513" },
        { firstName: { contains: "MANSI" } }
      ]
    },
    include: {
      collections: true,
      financial: {
        include: {
          components: { include: { masterComponent: true } },
          discounts: true
        }
      },
      transport: true,
      academic: { include: { class: true } }
    }
  });

  if (!student) {
    console.log("No student record found for K.MANSI / VM513!");
    return;
  }

  console.log(`Student ID: ${student.id}`);
  console.log(`Admission Number: "${student.admissionNumber}"`);
  console.log(`Student Name: "${student.firstName} ${student.lastName}"`);
  console.log(`Class: "${student.academic?.class?.name}"`);
  console.log(`Transport Opted-In: ${student.transport?.transportRequired ? "YES" : "NO"}`);
  console.log(`Transport Route/Stop: ${student.transport?.routeId || "Self"}`);
  console.log(`Total Collections in DB: ${student.collections.length}`);

  for (const c of student.collections) {
    console.log(`\n- Collection ID: ${c.id}`);
    console.log(`  System ReceiptNo: ${c.receiptNumber} | BookReceiptNo: ${c.bookReceiptNo}`);
    console.log(`  Payment Date: ${c.paymentDate}`);
    console.log(`  Total Paid: ₹${c.totalPaid} | Payment Mode: ${c.paymentMode}`);
    console.log(`  Fee Head / AllocatedTo:`, JSON.stringify(c.allocatedTo, null, 2));
  }

  if (student.financial) {
    console.log(`\nFinancial Record:`);
    console.log(`  Annual Tuition: ₹${student.financial.annualTuition}`);
    console.log(`  Total Discount: ₹${student.financial.totalDiscount}`);
    console.log(`  Net Tuition:    ₹${student.financial.netTuition}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
