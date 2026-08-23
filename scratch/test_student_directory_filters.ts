import { getStudentListAction } from "./src/lib/actions/student-actions";

async function testFilters() {
  console.log("=== TESTING ENHANCED STUDENT DIRECTORY FEE FILTERS ===");

  const filterKeys = ["all", "fully_paid", "term1_paid", "partially_paid", "dues_pending", "advance_surplus"];

  for (const f of filterKeys) {
    const res = await getStudentListAction({ feeStatus: f, branchId: "VIVES-RCB" });
    if (res.success && Array.isArray(res.data)) {
      console.log(`Filter [${f.padEnd(16)}]: ${res.data.length} students matched`);
    } else {
      console.error(`Filter [${f}]: ERROR ->`, res.error);
    }
  }

  // Test searching by Father Name 'RAVINDER'
  const searchRes = await getStudentListAction({ search: "RAVINDER", branchId: "VIVES-RCB" });
  if (searchRes.success && Array.isArray(searchRes.data)) {
    console.log(`\nSearch ['RAVINDER']: ${searchRes.data.length} students matched`);
    for (const s of searchRes.data.slice(0, 5)) {
      console.log(`- ${s.firstName} ${s.lastName} (Father: ${s.family?.fatherName}, AdmNo: ${s.admissionNumber}) | Collections: ${s.collections?.length || 0}`);
    }
  }
}

testFilters().catch(console.error);
