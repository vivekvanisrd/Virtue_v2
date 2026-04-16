import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function inspectFeeData() {
  console.log("# 🏛️ Virtue V2 Fee Architecture Inspection\n");

  try {
    // 1. Fee Component Master
    const components = await prisma.feeComponentMaster.findMany({ take: 10 });
    console.log("## 📦 Fee Component Master");
    if (components.length === 0) {
      console.log("> [!NOTE]\n> Table is currently empty (No global components defined yet).\n");
    } else {
      console.table(components.map(c => ({ ID: c.id.slice(0,8), Name: c.name, Type: c.type, OneTime: c.isOneTime })));
    }

    // 2. Fee Structure (Templates)
    const structures = await prisma.feeStructure.findMany({ 
      take: 10,
      include: { class: true, academicYear: true } 
    });
    console.log("\n## 🎨 Fee Structure Templates");
    if (structures.length === 0) {
       console.log("> [!NOTE]\n> Table is currently empty (No class templates designed yet).\n");
    } else {
       console.table(structures.map(s => ({ 
         ID: s.id.slice(0,8), 
         Name: s.name, 
         Class: s.class?.name || "N/A", 
         Year: s.academicYear?.name || "N/A", 
         Total: Number(s.totalAmount) 
       })));
    }

    // 3. Template Components
    const templateComps = await prisma.feeTemplateComponent.findMany({
      take: 10,
      include: { masterComponent: true, template: true }
    });
    console.log("\n## 🧩 Template Component Junctions");
    if (templateComps.length === 0) {
        console.log("> [!NOTE]\n> Table is currently empty.\n");
    } else {
        console.table(templateComps.map(tc => ({
            Template: tc.template.name,
            Component: tc.masterComponent.name,
            Amount: Number(tc.amount),
            Schedule: tc.scheduleType
        })));
    }

    // 4. Student Ledger (Adjustment Layer)
    const ledger = await prisma.studentFeeComponent.findMany({
      take: 10,
      include: { masterComponent: true, financialRecord: { include: { student: true } } }
    });
    console.log("\n## 👤 Student Ledger (Adjustment Layer)");
    if (ledger.length === 0) {
        console.log("> [!NOTE]\n> Table is currently empty (No students aligned to modular templates yet).\n");
    } else {
        console.table(ledger.map(l => ({
            Student: l.financialRecord.student.name,
            Component: l.masterComponent.name,
            Base: Number(l.baseAmount),
            Waiver: Number(l.waiverAmount),
            Reason: l.waiverReason || "None"
        })));
    }

  } catch (error) {
    console.error("Error inspecting database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectFeeData();
