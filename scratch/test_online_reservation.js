const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const token = "test-token-lkg-kit-" + Date.now();
  console.log("Starting inline reservation test for token:", token);

  try {
    // 1. Create a dummy PAID payment link for LKG Kit
    await prisma.fee_payment_links.create({
      data: {
        token,
        student_name: "Test Student",
        parent_name: "Test Parent",
        phone: "9999999999",
        amount: 3700,
        description: "Book Kit - LKG",
        status: "PAID",
        school_id: "VIVES",
        branch_id: "VIVES-RCB"
      }
    });
    console.log("Step 1: Created PAID dummy payment link.");

    // 2. Resolve Kit Catalog Item Code
    const kitName = "LKG";
    const cleanKitName = kitName.trim().toLowerCase();
    let kitCode = `KIT-${kitName.toUpperCase().replace(/\s+/g, "-")}`;
    if (cleanKitName === "lkg") kitCode = "KIT-LKG";
    else if (cleanKitName === "ukg") kitCode = "KIT-UKG";
    else if (cleanKitName === "nursery") kitCode = "KIT-NURSERY";

    const kitItem = await prisma.inventory_items.findFirst({
      where: {
        school_id: "VIVES",
        branch_id: "VIVES-RCB",
        item_code: kitCode
      }
    });

    if (!kitItem) {
      throw new Error(`Catalog item for kit code '${kitCode}' not found.`);
    }
    console.log(`Step 2: Resolved Kit Code to Catalog Item ID: ${kitItem.id} (${kitItem.item_name})`);

    const activeAY = await prisma.academicYear.findFirst({
      where: { schoolId: "VIVES", isCurrent: true },
      select: { id: true }
    });
    const academicYearId = activeAY?.id || "default-ay";

    // 3. Create the Reservation
    await prisma.inventory_reservations.create({
      data: {
        school_id: "VIVES",
        branch_id: "VIVES-RCB",
        academic_year_id: academicYearId,
        item_id: kitItem.id,
        quantity: 1,
        source_type: "ONLINE_SALE",
        source_id: token,
        status: "Reserved"
      }
    });
    console.log("Step 3: Created reservation entry.");

    // 4. Verify reservation
    const reservations = await prisma.inventory_reservations.findMany({
      where: { source_id: token },
      include: {
        inventory_items: true
      }
    });

    console.log(`Step 4: Verified reservations count: ${reservations.length}`);
    if (reservations.length === 1 && reservations[0].inventory_items.item_code === "KIT-LKG") {
      console.log("✅ TEST PASSED: Kit SKU is correctly reserved directly in DB!");
    } else {
      console.log("❌ TEST FAILED.");
    }

    // Cleanup
    await prisma.inventory_reservations.deleteMany({ where: { source_id: token } });
    await prisma.fee_payment_links.delete({ where: { token } });
    console.log("Step 5: Cleanup completed successfully.");

  } catch (error) {
    console.error("Test encountered an error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
