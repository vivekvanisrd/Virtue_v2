const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const kit = await prisma.inventory_kits.findFirst({
      where: { school_id: "VIVES", branch_id: "VIVES-RCB", kit_name: "LKG" }
    });

    if (!kit) {
      console.error("LKG Kit not found!");
      return;
    }

    console.log("Found LKG Kit ID:", kit.id);

    const activeAY = await prisma.academicYear.findFirst({
      where: { schoolId: "VIVES", isCurrent: true }
    });

    console.log("Active AY:", activeAY.id);

    const res = await fetch("http://localhost:3000/api/inventory/kits/disassemble", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-v2-school-id": "VIVES",
        "x-v2-branch-id": "VIVES-RCB",
        "x-v2-staff-id": "test-clerk",
        "x-v2-name": "Test Clerk"
      },
      body: JSON.stringify({
        kit_id: kit.id,
        quantity: 1,
        academic_year_id: activeAY.id
      })
    });

    const data = await res.json();
    console.log("API Response Status:", res.status);
    console.log("API Response Body:", data);

  } catch (error) {
    console.error("Request failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
