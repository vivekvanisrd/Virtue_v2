/**
 * CRISIS ENGINE: Registry of models that reference schoolId/branchId
 * Used for manual cascading updates in emergency scenarios.
 */

export const SCHOOL_ID_DEPENDENTS = [
  { model: "branch", column: "schoolId" },
  { model: "academicYear", column: "schoolId" },
  { model: "financialYear", column: "schoolId" },
  { model: "student", column: "schoolId" },
  { model: "staff", column: "schoolId" },
  { model: "feeStructure", column: "schoolId" },
  { model: "collection", column: "schoolId" },
  { model: "chartOfAccount", column: "schoolId" },
  { model: "journalEntry", column: "schoolId" },
  { model: "notification", column: "schoolId" },
  { model: "tenancyCounter", column: "schoolId" },
  { model: "enquiry", column: "schoolId" },
  { model: "academicHistory", column: "schoolId" },
  { model: "academicRecord", column: "schoolId" },
  { model: "document", column: "schoolId" },
  { model: "financialRecord", column: "schoolId" },
  { model: "discount", column: "schoolId" },
  { model: "discountType", column: "schoolId" },
  { model: "studentAttendance", column: "schoolId" },
  { model: "route", column: "schoolId" },
  { model: "studentTransportAssignment", column: "schoolId" },
  { model: "subject", column: "schoolId" },
  { model: "examType", column: "schoolId" },
  { model: "gradeScale", column: "schoolId" },
  { model: "examResult", column: "schoolId" },
];

export const BRANCH_ID_DEPENDENTS = [
  { model: "academicRecord", column: "branchId" },
  { model: "staff", column: "branchId" },
  { model: "feeStructure", column: "branchId" },
  { model: "collection", column: "branchId" },
  { model: "chartOfAccount", column: "branchId" },
  { model: "tenancyCounter", column: "branchId" },
];
