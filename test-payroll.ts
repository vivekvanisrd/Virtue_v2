import { PayrollEngine } from "./src/lib/services/payroll-engine.ts";

console.log("--- Payroll Engine Verification ---");

// Test 1: Simple Formula
const f1 = "0.5 * basic";
const res1 = PayrollEngine.evaluateFormula(f1, { basic: 10000 });
console.log(`Test 1 (0.5 * 10000): Expected 5000, Got ${res1}`);

// Test 2: Complex Formula
const f2 = "0.4 * basic + 200";
const res2 = PayrollEngine.evaluateFormula(f2, { basic: 10000 });
console.log(`Test 2 (0.4 * 10000 + 200): Expected 4200, Got ${res2}`);

// Test 3: 50% Rule Compliance (Compliant)
const prof3 = {
  basicSalary: 15000,
  hraAmount: 5000,
  specialAllowance: 5000,
  isDAEnabled: true,
  daFormula: "0.1 * basic" // 1500
};
// Gross = 15000 + 1500 + 5000 + 5000 = 26500
// Basic + DA = 16500. 50% of Gross = 13250. 
// Compliant: Yes.
const res3 = PayrollEngine.calculateStaffRemuneration(prof3);
console.log(`Test 3 (Compliant 50%): Expected true, Got ${res3.isCompliant}`);
console.log(`Gross: ${res3.grossRemuneration}, Compliance Base: ${res3.complianceBase}`);

// Test 4: 50% Rule Violation (Non-Compliant)
const prof4 = {
  basicSalary: 10000,
  hraAmount: 10000,
  specialAllowance: 10000,
  isDAEnabled: false
};
// Gross = 10000 + 10000 + 10000 = 30000
// Basic + DA = 10000. 50% of Gross = 15000.
// Compliant: No.
const res4 = PayrollEngine.calculateStaffRemuneration(prof4);
console.log(`Test 4 (Violation 50%): Expected false, Got ${res4.isCompliant}`);
console.log(`Gross: ${res3.grossRemuneration}, Compliance Base: ${res4.complianceBase}`);
console.log(`Violations: ${res4.violations[0]}`);

console.log("--- Verification Complete ---");
