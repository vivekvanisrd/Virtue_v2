import dns from "dns";
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import { prismaBypass } from "../src/lib/prisma";

async function main() {
  const schoolId = "VIVES";
  const branchId = "VIVES-RCB";

  console.log("⏱️  Starting deep database audit for all students under branch VIVES-RCB...\n");

  const students = await prismaBypass.student.findMany({
    where: { schoolId, branchId },
    include: {
      academic: { include: { class: true } },
      financial: { include: { components: true } },
      family: true,
      address: true,
      studentTransport: true,
      backboneInvoices: { include: { items: true } }
    }
  });

  console.log(`Loaded ${students.length} students from branch registry.`);

  let totalAnomalies = 0;
  let missingFamily = 0;
  let missingAddress = 0;
  let missingFinancial = 0;
  let missingTransportAllocation = 0;
  let missingInvoice = 0;
  let invoiceMismatch = 0;

  for (const student of students) {
    const name = `${student.firstName} ${student.lastName || ""}`.trim();
    const code = student.studentCode || student.bookId || "NO_CODE";
    const className = student.academic?.class?.name || "N/A";
    const anomalies: string[] = [];

    // 1. Check Family Profile
    if (!student.family) {
      anomalies.push("Missing FamilyDetail record");
      missingFamily++;
    }

    // 2. Check Address Record
    if (!student.address) {
      anomalies.push("Missing Address record");
      missingAddress++;
    }

    // 3. Check Financial Profile
    if (!student.financial) {
      anomalies.push("Missing FinancialRecord profile");
      missingFinancial++;
    } else {
      // 4. Check Transport Fee Mappings
      const transFee = Number(student.financial.transportFee || 0);
      if (transFee > 0 && !student.studentTransport) {
        anomalies.push(`Transport Fee is ₹${transFee} but has no StudentTransport stop allocation`);
        missingTransportAllocation++;
      }
    }

    // 5. Check Invoices
    const invoices = student.backboneInvoices || [];
    if (invoices.length === 0) {
      anomalies.push("Missing FeeInvoice record");
      missingInvoice++;
    } else {
      // Check first active invoice totals match expected values
      const invoice = invoices[0];
      const tFee = Number(student.financial?.tuitionFee || 0);
      const aFee = Number(student.financial?.admissionFee || 0);
      const transFee = Number(student.financial?.transportFee || 0);
      const disc = Number(student.financial?.totalDiscount || 0);
      const expectedTotal = tFee + aFee + transFee - disc;

      if (Number(invoice.totalAmount) !== expectedTotal) {
        anomalies.push(`Invoice total amount mismatch: Invoice has ₹${Number(invoice.totalAmount)}, expected ₹${expectedTotal} (Tuition: ₹${tFee}, Admission: ₹${aFee}, Transport: ₹${transFee}, Concession: ₹${disc})`);
        invoiceMismatch++;
      }
    }

    if (anomalies.length > 0) {
      totalAnomalies++;
      console.log(`🚩 Student: ${name} (${code}) | Class: ${className}`);
      anomalies.forEach(err => console.log(`   - ${err}`));
      console.log("");
    }
  }

  console.log("----------------------------------------------------------------");
  console.log("📊 Deep Audit Summary Report:");
  console.log(`- Total Students Scanned: ${students.length}`);
  console.log(`- Students with Anomalies: ${totalAnomalies}`);
  console.log(`- Missing Family Records: ${missingFamily}`);
  console.log(`- Missing Address Records: ${missingAddress}`);
  console.log(`- Missing Financial Profiles: ${missingFinancial}`);
  console.log(`- Missing Transport Allocations: ${missingTransportAllocation}`);
  console.log(`- Missing Invoice Records: ${missingInvoice}`);
  console.log(`- Invoice Total Mismatches: ${invoiceMismatch}`);
  console.log("----------------------------------------------------------------");
}

main()
  .catch(console.error)
  .finally(() => prismaBypass.$disconnect());
