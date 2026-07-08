import { prismaBypass } from "@/lib/prisma";

export interface ValidationReport {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export class ValidationEngine {
  /**
   * Performs high-density stat checks for an employee before payroll calculations.
   */
  static async validateStaff(
    schoolId: string,
    staffId: string,
    salaryStructure: { basicSalary: number },
    targetDate: Date
  ): Promise<ValidationReport> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Fetch UAN Master
    const uanRecord = await prismaBypass.uANMaster.findUnique({
      where: { staffId }
    });

    if (!uanRecord) {
      warnings.push(`UANMaster record is missing.`);
    } else if (!uanRecord.uan) {
      errors.push(`Employee UAN is missing but registered in UANMaster.`);
    }

    // 2. Fetch KYC Master Documents
    const kycRecords = await prismaBypass.kYCMaster.findMany({
      where: { staffId }
    });

    const standardDocs = ["AADHAAR", "PAN", "BANK_ACCOUNT"];
    standardDocs.forEach(docType => {
      const record = kycRecords.find(k => k.documentType === docType);
      if (!record) {
        warnings.push(`KYC Document '${docType}' is missing.`);
      } else if (record.status !== "VERIFIED") {
        warnings.push(`KYC Document '${docType}' is in '${record.status}' state.`);
      }
    });

    // 3. Verify Salary Structure
    if (salaryStructure.basicSalary <= 0) {
      errors.push(`Basic Salary is 0 or negative.`);
    }

    return {
      success: errors.length === 0,
      errors,
      warnings
    };
  }
}
