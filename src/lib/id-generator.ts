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
   * PREDICATIVE ENGINE: Suggests available school codes from a name
   */
  static async suggestSchoolCodes(name: string): Promise<string[]> {
    if (!name || name.length < 3) return [];
    const clean = name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim();
    const suggestions = new Set<string>();

    const words = clean.split(/\s+/);
    // 1. First letters of words (e.g. Greenwood High School -> GHS)
    if (words.length >= 2) {
      const initials = words.map(w => w[0]).join('').substring(0, 5);
      if (initials.length >= 2) suggestions.add(initials);
    }

    // 2. First 3 or 4 letters
    if (clean.length >= 3) {
      suggestions.add(clean.substring(0, 3));
      if (clean.length >= 4) suggestions.add(clean.substring(0, 4));
    }

    // 3. First word consonants
    if (words[0]) {
      const consonants = words[0].replace(/[AEIOU]/g, '').substring(0, 4);
      if (consonants.length >= 3) suggestions.add(consonants);
    }

    // Filter out suggestions that are already in the DB
    const list = Array.from(suggestions);
    const existing = await prisma.school.findMany({
      where: { code: { in: list } },
      select: { code: true }
    });
    const taken = new Set(existing.map(s => s.code));

    return list.filter(code => !taken.has(code));
  }

  /**
   * generateAcademicYearId (Pillar 4 DNA)
   */
  static generateAcademicYearId(schoolCode: string, yearLabel: string): string {
    return CounterService.generateAcademicYearId(schoolCode, yearLabel);
  }
}
