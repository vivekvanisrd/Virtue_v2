import prisma from "../prisma";

/**
 * CounterService (V2)
 * 
 * Implements the Global ID Generation Spec.
 * Uses atomic increments via 'TenancyCounter' table.
 */
export const CounterService = {
  /**
   * getNextSequence
   * 
   * Atomically increments and returns the next sequence number.
   */
  async getNextSequence(params: {
    schoolId: string;
    branchId?: string | null;
    type: string;
    year: string;
  }, tx?: any): Promise<number> {
    const p = tx || prisma;
    const branchId = params.branchId || "GLOBAL";
    const counter = await p.tenancyCounter.upsert({
      where: {
        schoolId_branchId_type_year: {
          schoolId: params.schoolId,
          branchId,
          type: params.type,
          year: params.year
        }
      },
      update: {
        lastValue: { increment: 1 }
      },
      create: {
        schoolId: params.schoolId,
        branchId,
        type: params.type,
        year: params.year,
        lastValue: 1
      }
    });

    return counter.lastValue;
  },

  /**
   * generateStudentCode
   * Format: {SCH}-STU-{YEAR}-{SEQ_4}
   */
  async generateStudentCode(schoolId: string, schoolCode: string, year: string, tx?: any): Promise<string> {
    const seq = await this.getNextSequence({
      schoolId,
      type: "STUDENT",
      year
    }, tx);
    return `${schoolCode}-STU-${year}-${seq.toString().padStart(4, '0')}`;
  },

  /**
   * generateAdmissionNumber
   * Format: {SCH}-ADM-{YEAR}-{BR_CODE}-{SEQ_5}
   */
  async generateAdmissionNumber(params: {
    schoolId: string;
    schoolCode: string;
    branchId: string;
    branchCode: string;
    year: string;
  }, tx?: any): Promise<string> {
    const seq = await this.getNextSequence({
      schoolId: params.schoolId,
      branchId: params.branchId,
      type: "ADMISSION",
      year: params.year
    }, tx);
    return `${params.schoolCode}-ADM-${params.year}-${params.branchCode}-${seq.toString().padStart(5, '0')}`;
  },

  /**
   * generateReceiptNumber
   * Format: {SCH}-REC-{YEAR}-{BR_CODE}-{SEQ_5}
   */
  async generateReceiptNumber(params: {
    schoolId: string;
    schoolCode: string;
    branchId: string;
    branchCode: string;
    year: string;
  }, tx?: any): Promise<string> {
    const seq = await this.getNextSequence({
      schoolId: params.schoolId,
      branchId: params.branchId,
      type: "RECEIPT",
      year: params.year
    }, tx);
    return `${params.schoolCode}-REC-${params.year}-${params.branchCode}-${seq.toString().padStart(5, '0')}`;
  },

  /**
   * generateStaffCode
   * Format: {SCH}-USR-{ROLE}-{SEQ_4}
   */
  async generateStaffCode(params: {
    schoolId: string;
    schoolCode: string;
    role: string; // e.g., TCHR, ADM
  }, tx?: any): Promise<string> {
    const seq = await this.getNextSequence({
      schoolId: params.schoolId,
      type: `STAFF_${params.role}`,
      year: "GLOBAL" // Staff IDs don't reset annually in the spec usually, or stay consistent.
    }, tx);
    return `${params.schoolCode}-USR-${params.role}-${seq.toString().padStart(4, '0')}`;
  },

  /**
   * generateFeeStructureCode
   * Format: {SCH}-{BR_CODE}-FEE-{YEAR}-{CLASS}
   */
  generateFeeStructureCode(params: {
    schoolCode: string;
    branchCode: string;
    year: string;
    className: string;
  }): string {
    const sanitizedClass = params.className.replace(/\s+/g, '').toUpperCase();
    return `${params.schoolCode}-${params.branchCode}-FEE-${params.year}-${sanitizedClass}`;
  }
};
