import { CounterService } from "./services/counter-service";
import prisma from "./prisma";

/**
 * 🔒 V11 ID GENERATOR (The Sovereign Sentinel)
 * 
 * Implements the "Golden DNA" Protocol (Rule 2.1)
 * Enforces the "Double-Sentinel" Vacancy Check (Rule 2.3)
 */

const ROLE_CODES: Record<string, string> = {
  'Developer': 'DEVP',
  'Owner/Partner': 'OWNR',
  'Super User': 'SU',
  'Principal': 'PRIN',
  'Accountant': 'ACC',
  'Teacher': 'TEAC',
  'Librarian': 'LIBR',
  'Admin Staff': 'ADMN'
};

export class IdGenerator {
  /**
   * 🛡️ DOUBLE-SENTINEL: Verifies vacancy in the database
   */
  private static async verifyVacancy(model: string, id: string, tx?: any): Promise<boolean> {
    const p = tx || prisma;
    const exists = await (p as any)[model].findUnique({
      where: { id },
      select: { id: true }
    });
    return !exists;
  }

  /**
   * generateStudentCode (Rule 2.1 Golden DNA)
   */
  static async generateStudentCode(params: {
    schoolId: string;
    schoolCode: string;
    branchId: string;
    branchCode: string;
    year: string;
  }, tx?: any): Promise<string> {
    const id = await CounterService.generateAdmissionNumber(params, tx);
    
    // 🛡️ Rule 2.3: Double-Sentinel Verify
    if (!(await this.verifyVacancy('student', id, tx))) {
        throw new Error(`SECURITY_VIOLATION: ID Collision detected for '${id}'. Operation aborted to prevent data corruption.`);
    }
    
    return id;
  }

  /**
   * generateStaffCode (Rule 2.1 Golden DNA)
   */
  static async generateStaffCode(params: {
    schoolId: string;
    schoolCode: string;
    branchId: string;
    branchCode: string;
    role: string;
  }, tx?: any): Promise<string> {
    const id = await CounterService.generateStaffCode(params, tx);
    
    // 🛡️ Rule 2.3: Double-Sentinel Verify
    if (!(await this.verifyVacancy('staff', id, tx))) {
        throw new Error(`SECURITY_VIOLATION: ID Collision detected for staff '${id}'.`);
    }

    return id;
  }

  /**
   * generateBranchId (Rule 2.1 Golden DNA)
   */
  static async generateBranchId(params: {
    schoolId: string;
    schoolCode: string;
    branchCode: string;
  }, tx?: any): Promise<string> {
    const bCode = params.branchCode.toUpperCase();
    const id = `${params.schoolCode}-${bCode}`;
    
    // 🛡️ Rule 2.3: Double-Sentinel Verify
    if (!(await this.verifyVacancy('branch', id, tx))) {
        throw new Error(`SECURITY_VIOLATION: Branch code '${bCode}' is already in use.`);
    }

    return id;
  }

  /**
   * generateAcademicYearId (Pillar 4 DNA)
   */
  static generateAcademicYearId(schoolCode: string, yearLabel: string): string {
    return CounterService.generateAcademicYearId(schoolCode, yearLabel);
  }
}
