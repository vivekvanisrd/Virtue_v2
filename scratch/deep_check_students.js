const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const SCHOOL_ID = "VIVES";
  const BRANCH_ID = "VIVES-RCB";
  const AY_ID = "AY-2025-26-VIVES";

  const expectedFees = {
    "Play Group": 25000,
    "Nursery": 25200,
    "LKG": 25300,
    "UKG": 27500,
    "1st Grade": 33000,
    "2nd Grade": 33000,
    "3rd Grade": 35200,
    "4th Grade": 35200,
    "5th Grade": 37400,
    "6th Grade": 37400,
    "7th Grade": 38500,
    "8th Grade": 38500,
    "9th Grade": 42000
  };

  console.log("🔍 [DEEP_CHECK] Initiating validation for VIVES-RCB Students (AY 2025-26)...");

  try {
    const students = await prisma.student.findMany({
      where: {
        schoolId: SCHOOL_ID,
        branchId: BRANCH_ID,
        isDeleted: false,
        status: "Active"
      },
      include: {
        academic: {
          include: {
            class: true,
            section: true
          }
        },
        financial: {
          include: {
            components: {
              include: {
                masterComponent: true
              }
            },
            feeStructure: true
          }
        }
      }
    });

    console.log(`📊 Retrieved ${students.length} active students in the branch.`);

    let issuesFound = 0;
    let missingFinancials = 0;
    let feeMismatches = 0;
    let missingAcademic = 0;
    let missingClass = 0;
    let missingSection = 0;

    const classStats = {};

    students.forEach(student => {
      const name = `${student.firstName} ${student.lastName || ""}`.trim();
      
      // 1. Check Academic Details
      const acad = student.academic;
      if (!acad) {
        console.error(`❌ [ACADEMIC] Student ${name} (ID: ${student.id}) has no AcademicHistory record.`);
        missingAcademic++;
        issuesFound++;
        return;
      }

      const className = acad.class?.name;
      if (!className) {
        console.error(`❌ [CLASS] Student ${name} (ID: ${student.id}) has no associated class.`);
        missingClass++;
        issuesFound++;
        return;
      }

      const sectionName = acad.section?.name;
      if (!sectionName) {
        console.error(`⚠️ [SECTION] Student ${name} (ID: ${student.id}) class "${className}" has no associated section.`);
        missingSection++;
        issuesFound++;
      }

      // Update statistics
      classStats[className] = (classStats[className] || 0) + 1;

      // 2. Check Financial Details
      const fin = student.financial;
      if (!fin) {
        console.error(`❌ [FINANCIAL] Student ${name} (ID: ${student.id}, Class: ${className}) has no FinancialRecord.`);
        missingFinancials++;
        issuesFound++;
        return;
      }

      const expectedFee = expectedFees[className];
      if (expectedFee === undefined) {
        console.error(`⚠️ [CONFIG] Class "${className}" has no expected fee structure defined in checklist.`);
        return;
      }

      const actualTuition = Number(fin.tuitionFee);
      if (actualTuition !== expectedFee) {
        console.error(`❌ [FEE_MISMATCH] Student ${name} in "${className}": Expected Tuition ₹${expectedFee}, but DB has ₹${actualTuition}.`);
        feeMismatches++;
        issuesFound++;
        return;
      }

      // Check Fee Structure Mapping
      if (!fin.feeStructure) {
        console.error(`❌ [TEMPLATE_MISSING] Student ${name} in "${className}" has no associated FeeStructure template.`);
        issuesFound++;
        return;
      }

      // Check Component Mapping
      const tuitionComp = fin.components.find(c => c.masterComponent?.name === "Tuition Fee");
      if (!tuitionComp) {
        console.error(`❌ [COMP_MISSING] Student ${name} in "${className}" is missing "Tuition Fee" component.`);
        issuesFound++;
        return;
      }

      const actualCompAmount = Number(tuitionComp.baseAmount);
      if (actualCompAmount !== expectedFee) {
        console.error(`❌ [COMP_MISMATCH] Student ${name} in "${className}": Component Tuition Fee base amount is ₹${actualCompAmount}, expected ₹${expectedFee}.`);
        issuesFound++;
        return;
      }
    });

    console.log("\n📈 Class Enrolment Statistics (AY 2025-26):");
    Object.entries(classStats).forEach(([cls, count]) => {
      console.log(`- ${cls}: ${count} students (Tuition: ₹${expectedFees[cls] || 0})`);
    });

    console.log("\n==========================================");
    if (issuesFound === 0) {
      console.log("✅ [SUCCESS] DEEP CHECK PASSED! All students are mapped 100% correctly with correct class, section, and fee details.");
    } else {
      console.error(`❌ [FAILURE] DEEP CHECK FAILED. Found ${issuesFound} issues.`);
      console.error(`- Missing Academic Records: ${missingAcademic}`);
      console.error(`- Missing Classes: ${missingClass}`);
      console.error(`- Missing Sections: ${missingSection}`);
      console.error(`- Missing Financial Profiles: ${missingFinancials}`);
      console.error(`- Fee/Component Mismatches: ${feeMismatches}`);
    }
    console.log("==========================================");

  } catch (error) {
    console.error("Deep check execution failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
