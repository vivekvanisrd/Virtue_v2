import fs from "fs";
import path from "path";
import { prismaBypass as prisma } from "../src/lib/prisma";

const SCHOOL_ID = "VIVES";

async function main() {
  console.log("=== GENERATING COMPREHENSIVE IMPORT REPORT FOR VIVES EDUX INSTITUTION ===");

  const school = await prisma.school.findUnique({
    where: { id: SCHOOL_ID },
    include: {
      branches: true,
      Class: true,
    }
  });

  if (!school) {
    console.error(`School ${SCHOOL_ID} not found.`);
    return;
  }

  // Fetch all students with relations
  const students = await prisma.student.findMany({
    where: { schoolId: SCHOOL_ID },
    include: {
      branch: true,
      academic: {
        include: {
          class: true
        }
      },
      family: true,
      financial: true
    }
  });

  console.log(`Total students in DB for ${school.name}: ${students.length}`);

  // 1. Branch Breakdown
  const branchCounts: Record<string, { name: string; count: number }> = {};
  for (const b of school.branches) {
    branchCounts[b.id] = { name: b.name, count: 0 };
  }
  branchCounts["UNASSIGNED"] = { name: "Unassigned Branch", count: 0 };

  // 2. Class Breakdown
  const classCounts: Record<string, { name: string; count: number; totalTuition: number; totalConcession: number; netPayable: number }> = {};
  for (const c of school.Class) {
    classCounts[c.id] = { name: c.name, count: 0, totalTuition: 0, totalConcession: 0, netPayable: 0 };
  }
  classCounts["UNASSIGNED"] = { name: "Unassigned Class", count: 0, totalTuition: 0, totalConcession: 0, netPayable: 0 };

  // 3. Financial Totals
  let totalGrossTuition = 0;
  let totalAdmissionFees = 0;
  let totalTransportFees = 0;
  let totalConcessions = 0;
  let totalNetPayable = 0;
  let totalPaid = 0;
  let totalDueBalance = 0;

  for (const st of students) {
    // Branch count
    const bId = st.branchId && branchCounts[st.branchId] ? st.branchId : "UNASSIGNED";
    branchCounts[bId].count++;

    // Class count
    const cId = st.academic?.classId && classCounts[st.academic.classId] ? st.academic.classId : "UNASSIGNED";
    classCounts[cId].count++;

    // Financial calculations
    if (st.financial) {
      const tuition = Number(st.financial.tuitionFee || st.financial.annualTuition || 0);
      const admission = Number(st.financial.admissionFee || 0);
      const transport = Number(st.financial.transportFee || 0);
      const discount = Number(st.financial.totalDiscount || 0);
      const net = Number(st.financial.netTuition || (tuition - discount));

      totalGrossTuition += tuition;
      totalAdmissionFees += admission;
      totalTransportFees += transport;
      totalConcessions += discount;
      totalNetPayable += net + admission + transport;

      classCounts[cId].totalTuition += tuition;
      classCounts[cId].totalConcession += discount;
      classCounts[cId].netPayable += net + admission + transport;
    }
  }

  const reportSummary = {
    institutionName: school.name,
    institutionId: school.id,
    totalStudents: students.length,
    branchBreakdown: Object.values(branchCounts).filter(b => b.count > 0),
    classBreakdown: Object.values(classCounts).filter(c => c.count > 0),
    financialSummary: {
      totalGrossTuition,
      totalAdmissionFees,
      totalTransportFees,
      totalConcessions,
      totalNetPayable
    }
  };

  console.log("=== REPORT SUMMARY JSON ===");
  console.log(JSON.stringify(reportSummary, null, 2));

  // Save report artifact to scratch/report_vives.json
  fs.writeFileSync("scratch/report_vives.json", JSON.stringify(reportSummary, null, 2));
}

main().catch(console.error);
