const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Mimic calculateTermBreakdown from fee-utils
const calculateTermBreakdown = (annualTuition, totalDiscount = 0, paymentType = "Term-wise") => {
  const tuition = Number(annualTuition);
  const discount = Number(totalDiscount);
  let t1Amt, t2Amt, t3Amt;

  if (paymentType === "Annual") {
    t1Amt = Math.max(0, tuition - discount);
    t2Amt = 0;
    t3Amt = 0;
  } else {
    let remainingDiscount = discount;
    let t3Base = Math.round(tuition * 0.25);
    let t2Base = Math.round(tuition * 0.25);
    let t1Base = Math.round(tuition * 0.5);

    t3Amt = Math.max(0, t3Base - remainingDiscount);
    remainingDiscount = Math.max(0, remainingDiscount - t3Base);
    t2Amt = Math.max(0, t2Base - remainingDiscount);
    remainingDiscount = Math.max(0, remainingDiscount - t2Base);
    t1Amt = Math.max(0, t1Base - remainingDiscount);
  }
  const currentYear = new Date().getFullYear();
  return {
    term1: { amount: t1Amt, dueDate: new Date(currentYear, 5, 10), isPaid: false, label: paymentType === "Annual" ? "Annual Settlement" : "Term 1 (50%)" },
    term2: { amount: t2Amt, dueDate: new Date(currentYear, 9, 10), isPaid: false, label: "Term 2 (25%)" },
    term3: { amount: t3Amt, dueDate: new Date(currentYear + 1, 0, 10), isPaid: false, label: "Term 3 (Settlement)" },
    totalDiscount: discount,
    annualNet: t1Amt + t2Amt + t3Amt,
    paymentType
  };
};

async function main() {
  const studentId = "02197e56-487f-4ad2-b3d7-ed1a6cd2661f";
  const context = { schoolId: "VIVES" }; // Mocked context

  try {
    const student = await prisma.student.findFirst({
      where: { 
        id: studentId,
        schoolId: context.schoolId
      },
      include: {
        academic: { include: { class: true } },
        financial: { 
          include: { 
            components: { include: { masterComponent: { select: { id: true, name: true, type: true, accountCode: true } } } }, 
            discounts: { include: { discountType: true } },
            feeStructure: { include: { components: { include: { masterComponent: { select: { id: true, name: true, type: true, accountCode: true } } } } } }
          } 
        },
        ledgerEntries: { 
          orderBy: { createdAt: 'desc' }
        },
        collections: { 
          where: { status: "Success" },
          orderBy: { paymentDate: 'desc' } 
        }
      }
    });

    if (!student) throw new Error("Student not found or unauthorized.");

    const components = student.financial?.components || [];
    const tuition = components.length > 0 
        ? components.reduce((sum, c) => sum + Number(c.baseAmount || 0), 0)
        : Number(student.financial?.tuitionFee || student.financial?.annualTuition || 0);
    const discount = components.length > 0 
        ? components.reduce((sum, c) => sum + Number(c.waiverAmount || 0) + Number(c.discountAmount || 0), 0)
        : Number(student.financial?.totalDiscount || 0);
    const paymentType = student.financial?.paymentType || "Term-wise";
    
    const ledgerTuition = tuition === 0 && student.ledgerEntries && student.ledgerEntries.length > 0
        ? student.ledgerEntries.reduce((sum, entry) => sum + Number(entry.amount), 0)
        : tuition;

    const breakdown = calculateTermBreakdown(ledgerTuition, discount, paymentType);

    const paidTerms = student.collections.flatMap((c) => {
      const allocated = c.allocatedTo;
      if (!allocated) return [];
      const termsFromList = allocated.terms || [];
      const legacyTerms = ["term1", "term2", "term3"].filter(t => allocated[t] > 0);
      return [...new Set([...termsFromList, ...legacyTerms])];
    });

    breakdown.term1.isPaid = paidTerms.includes("term1");
    breakdown.term2.isPaid = paidTerms.includes("term2");
    breakdown.term3.isPaid = paidTerms.includes("term3");

    const ancillary = {};
    const fin = student.financial;

    if (fin?.feeStructure?.components) {
       fin.feeStructure.components.forEach((comp) => {
          const name = comp.masterComponent?.name?.toLowerCase() || "";
          if (name.includes("tuition")) return;

          let key = "";
          if (name.includes("admission")) key = "admissionFee";
          else if (name.includes("caution") || name.includes("deposit")) key = "cautionDeposit";
          else if (name.includes("transport") || name.includes("bus")) key = "transportFee";
          else if (name.includes("library")) key = "libraryFee";
          else if (name.includes("exam")) key = "examFee";
          else if (name.includes("computer")) key = "computerFee";
          else if (name.includes("sports") || name.includes("gym")) key = "sportsFee";
          else if (name.includes("activity")) key = "activityFee";
          else if (name.includes("book") || name.includes("stationary")) key = "booksFee";
          else if (name.includes("uniform") || name.includes("kit")) key = "uniformFee";
          else if (name.includes("miscellaneous")) key = "miscellaneousFee";
          else key = `tmpl_${comp.id}`;

          if (key && !ancillary[key]) {
             ancillary[key] = {
                amount: Number(comp.amount),
                isPaid: paidTerms.includes(key) || paidTerms.includes(comp.masterComponent.name),
                label: comp.masterComponent.name,
                dueDate: null
             };
          }
       });
    }

    if (fin?.components) {
      fin.components.forEach((comp) => {
        const name = comp.masterComponent?.name?.toLowerCase();
        if (!name || name.includes("tuition")) return;
        let key = "";
        
        if (name.includes("admission")) key = "admissionFee";
        else if (name.includes("caution") || name.includes("deposit")) key = "cautionDeposit";
        else if (name.includes("transport") || name.includes("bus")) key = "transportFee";
        else if (name.includes("library")) key = "libraryFee";
        else if (name.includes("exam")) key = "examFee";
        else if (name.includes("computer")) key = "computerFee";
        else if (name.includes("sports")) key = "sportsFee";
        else if (name.includes("activity")) key = "activityFee";
        else if (name.includes("book")) key = "booksFee";
        else if (name.includes("uniform")) key = "uniformFee";
        else key = `comp_${comp.id}`;

        if (key && !ancillary[key]) {
          ancillary[key] = {
            amount: Number(comp.baseAmount),
            isPaid: paidTerms.includes(key),
            label: comp.masterComponent.name,
            dueDate: null
          };
        }
      });
    }

    if (student.ledgerEntries && student.ledgerEntries.length > 0) {
       student.ledgerEntries.forEach((entry, index) => {
          const reason = entry.reason.toLowerCase();
          if (reason.includes("term 1") || reason.includes("term 2") || reason.includes("term 3") || 
              (reason.includes("tuition") && !reason.includes("admission") && !reason.includes("transport"))) return;

          let key = "";
          if (reason.includes("admission")) key = "admissionFee";
          else if (reason.includes("caution") || reason.includes("deposit")) key = "cautionDeposit";
          else if (reason.includes("transport") || reason.includes("bus")) key = "transportFee";
          else if (reason.includes("library")) key = "libraryFee";
          else if (reason.includes("exam")) key = "examFee";
          else if (reason.includes("computer")) key = "computerFee";
          else if (reason.includes("sports")) key = "sportsFee";
          else if (reason.includes("activity")) key = "activityFee";
          else if (reason.includes("book")) key = "booksFee";
          else if (reason.includes("uniform")) key = "uniformFee";
          else key = `misc_${index}`;

          if (key && !ancillary[key]) {
             ancillary[key] = {
                amount: Number(entry.amount),
                isPaid: paidTerms.includes(key) || paidTerms.includes(entry.reason),
                label: entry.reason.replace("Accrual: ", "").split(' (')[0],
                dueDate: null
             };
          }
       });
    }

    const masterRegistry = await prisma.feeComponentMaster.findMany({
      where: { schoolId: context.schoolId, isActive: true }
    });

    const posFinalCategories = [
      { key: "admissionFee", label: "Admission Fee" },
      { key: "transportFee", label: "Transport Fee" },
      { key: "libraryFee", label: "Library Fee" },
      { key: "sportsFee", label: "Sports Fee" },
      { key: "activityFee", label: "Activity Fee" },
      { key: "booksFee", label: "Books & Stationaries" },
      { key: "uniformFee", label: "Uniform Fee" },
      { key: "cautionDeposit", label: "Caution Deposit" }
    ];

    posFinalCategories.forEach(cat => {
      if (!ancillary[cat.key]) {
        const master = masterRegistry.find(m => 
          m.name.toLowerCase().includes(cat.label.toLowerCase()) || 
          cat.label.toLowerCase().includes(m.name.toLowerCase())
        );

        ancillary[cat.key] = {
          amount: master ? Number(master.amount) : 0,
          isPaid: false,
          label: cat.label,
          dueDate: null,
          isAdHoc: true,
          masterId: master?.id
        };
      }
    });
    
    breakdown.ancillary = ancillary;

    console.log("SUCCESS! Returned breakdown:", JSON.stringify(breakdown, null, 2));

  } catch (error) {
    console.error("FAILED with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
