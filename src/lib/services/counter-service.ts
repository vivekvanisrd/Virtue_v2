import prisma from "../prisma";

/**
 * CounterService (V2.1 - Golden DNA Hardened)
 * 
 * Implements the Global ID Generation Spec.
 * Uses atomic increments via 'TenancyCounter' table.
 */
export const CounterService = {
  /**
   * getNextSequence
   * 
   * Atomically increments and returns the next sequence number.
   * GUARANTEE: Atomic collision prevention at DB level.
   */
  async getNextSequence(params: {
    schoolId: string;
    branchId: string; // Mandated in V11
    type: string;
    year: string;
  }, tx?: any): Promise<number> {
    const p = tx || prisma;
    const counter = await p.tenancyCounter.upsert({
      where: {
        schoolId_branchId_type_year: {
          schoolId: params.schoolId,
          branchId: params.branchId,
          type: params.type,
          year: params.year
        }
      },
      update: {
        lastValue: { increment: 1 }
      },
      create: {
        schoolId: params.schoolId,
        branchId: params.branchId,
        type: params.type,
        year: params.year,
        lastValue: 1
      }
    });

    return counter.lastValue;
  },

  /**
   * sanitizeBranchCode (Rulebook Compliance)
   * Ensures {SCHOOL}-{BRANCH} format by stripping school prefix if present.
   * Example: VIVES + VIVESRCB -> RCB -> VIVES-RCB
   */
  sanitizeBranchCode(schoolCode: string, branchCode: string): string {
    const s = schoolCode.toUpperCase();
    const b = branchCode.toUpperCase();
    if (b.startsWith(s)) {
        return b.substring(s.length);
    }
    return b;
  },

  /**
   * generateRegistrationId (Rule 2.1 Golden DNA)
   * Format: {SCH}-{BCODE}-STU-{SEQ_7}
   */
  async generateRegistrationId(params: {
    schoolId: string;
    schoolCode: string;
    branchId: string;
    branchCode: string;
  }, tx?: any): Promise<string> {
    const seq = await this.getNextSequence({
      schoolId: params.schoolId,
      branchId: params.branchId,
      type: "REGISTRATION",
      year: "GLOBAL"
    }, tx);
    const shortBranch = this.sanitizeBranchCode(params.schoolCode, params.branchCode);
    return `${params.schoolCode}-${shortBranch}-STU-${seq.toString().padStart(7, '0')}`;
  },

  /**
   * generateAdmissionNumber (Rule 2.1 Golden DNA)
   * Format: {SCH}-{BCODE}-{YEAR}-STU-{SEQ_5}
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
      type: "STUDENT_ADMISSION",
      year: params.year
    }, tx);
    const shortBranch = this.sanitizeBranchCode(params.schoolCode, params.branchCode);
    return `${params.schoolCode}-${shortBranch}-${params.year}-STU-${seq.toString().padStart(5, '0')}`;
  },

  /**
   * generateReceiptNumber (Rule 2.1 Golden DNA)
   * Format: {SCH}-{BCODE}-{YEAR}-REC-{SEQ_5}
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
    const shortBranch = this.sanitizeBranchCode(params.schoolCode, params.branchCode);
    return `${params.schoolCode}-${shortBranch}-${params.year}-REC-${seq.toString().padStart(5, '0')}`;
  },

  /**
   * generateStaffCode (Rule 2.1 Golden DNA)
   * Format: {SCH}-{BCODE}-{ROLE}-{SEQ_4}
   */
  async generateStaffCode(params: {
    schoolId: string;
    schoolCode: string;
    branchId: string;
    branchCode: string;
    role: string;
  }, tx?: any): Promise<string> {
    const roleMap: Record<string, string> = {
        'TEACHER': 'TEAC',
        'ADMIN': 'ADMN',
        'MANAGEMENT': 'MGMT',
        'STAFF': 'STAF',
        'OWNER': 'OWNR',
        'DEVELOPER': 'DEVP'
    };
    const shortRole = roleMap[params.role.toUpperCase()] || params.role.substring(0, 4).toUpperCase();
    
    const seq = await this.getNextSequence({
      schoolId: params.schoolId,
      branchId: params.branchId,
      type: `STAFF_${shortRole}`, 
      year: "GLOBAL" 
    }, tx);

    const shortBranch = this.sanitizeBranchCode(params.schoolCode, params.branchCode);
    return `${params.schoolCode}-${shortBranch}-${shortRole}-${seq.toString().padStart(4, '0')}`;
  },

  /**
   * generateAcademicYearId (Pillar 4 DNA)
   * Format: {SCH}-HQ-AY-{YEAR}
   */
  generateAcademicYearId(schoolCode: string, yearLabel: string): string {
    return `${schoolCode}-HQ-AY-${yearLabel}`;
  },

  /**
   * generateStudentCode (Rule 2.1 Golden DNA)
   * Format: {SCH}-{BCODE}-{YEAR}-SID-{SEQ_6}
   */
  async generateStudentCode(params: {
    schoolId: string;
    schoolCode: string;
    branchId: string;
    branchCode: string;
    year: string;
  }, tx?: any): Promise<string> {
    const seq = await this.getNextSequence({
      schoolId: params.schoolId,
      branchId: params.branchId,
      type: "STUDENT_CODE",
      year: params.year
    }, tx);
    const shortBranch = this.sanitizeBranchCode(params.schoolCode, params.branchCode);
    return `${params.schoolCode}-${shortBranch}-${params.year}-SID-${seq.toString().padStart(6, '0')}`;
  },

  /**
   * generateProvisionalId (Rule 2.1 Golden DNA)
   * Format: {SCH}-{BCODE}-{YEAR}-PROV-{SEQ_6}
   */
  async generateProvisionalId(params: {
    schoolId: string;
    schoolCode: string;
    branchId: string;
    branchCode: string;
    year?: string;
  }, tx?: any): Promise<string> {
    const seq = await this.getNextSequence({
      schoolId: params.schoolId,
      branchId: params.branchId,
      type: "PROVISIONAL_ID",
      year: "GLOBAL"
    }, tx);
    const shortBranch = this.sanitizeBranchCode(params.schoolCode, params.branchCode);
    const yearPart = params.year ? `-${params.year}` : "";
    return `${params.schoolCode}-${shortBranch}${yearPart}-PROV-${seq.toString().padStart(5, '0')}`;
  }
};
