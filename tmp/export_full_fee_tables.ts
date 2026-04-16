import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function exportFullFeeTables() {
  console.log("# 🏛️ Virtue V2: Audit-Safe Tenancy Registry Export\n");

  try {
    // 1. FeeComponentMaster
    const components = await prisma.feeComponentMaster.findMany();
    console.log("## 📦 TABLE: `FeeComponentMaster` (Global Components)");
    console.log("| ID (UUID) | Name | Type | SCHOOL_ID (Tenancy Lock) |");
    console.log("| :--- | :--- | :--- | :--- |");
    components.forEach((c: any) => {
      console.log(`| ${c.id} | ${c.name} | ${c.type} | **${c.schoolId}** |`);
    });
    console.log("\n");

    // 2. FeeStructure (Templates)
    const structures = await prisma.feeStructure.findMany();
    console.log("## 🎨 TABLE: `FeeStructure` (Templates)");
    console.log("| ID (UUID) | Name | SCHOOL_ID | BRANCH_ID | TOTAL |");
    console.log("| :--- | :--- | :--- | :--- | :--- |");
    structures.forEach((s: any) => {
      console.log(`| ${s.id} | ${s.name} | **${s.schoolId}** | **${s.branchId}** | ₹${s.totalAmount} |`);
    });
    console.log("\n");

    // 3. FeeTemplateComponent (Junctions)
    const junctions = await prisma.feeTemplateComponent.findMany();
    console.log("## 🧩 TABLE: `FeeTemplateComponent` (Junctions)");
    console.log("| ID (UUID) | Template ID | SCHOOL_ID | Component ID | Amount |");
    console.log("| :--- | :--- | :--- | :--- | :--- |");
    junctions.forEach((j: any) => {
      console.log(`| ${j.id} | ${j.templateId} | **${j.schoolId}** | ${j.componentId} | ₹${j.amount} |`);
    });
    console.log("\n");

    // 4. StudentFeeComponent (Adjustment Layer)
    const ledgers = await prisma.studentFeeComponent.findMany();
    console.log("## 👤 TABLE: `StudentFeeComponent` (Individual Ledgers)");
    console.log("| ID (UUID) | Financial ID | SCHOOL_ID | Component ID | Base |");
    console.log("| :--- | :--- | :--- | :--- | :--- |");
    ledgers.forEach((l: any) => {
      console.log(`| ${l.id} | ${l.studentFinancialId} | **${l.schoolId}** | ${l.componentId} | ₹${l.baseAmount} |`);
    });

  } catch (error) {
    console.error("❌ Export Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

exportFullFeeTables();
