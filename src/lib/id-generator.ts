import { CounterService } from "./services/counter-service";
import prisma from "./prisma";

/**
 * V2 ID GENERATOR SERVICE (Unified)
 * 
 * Delegates to CounterService for atomic sequencing.
 * Maintains the Global ID Spec formats.
 */

const ROLE_CODES: Record<string, string> = {
  'Developer': 'DEV',
  'Owner/Partner': 'OWN',
  'Super User': 'SU',
  'Principal': 'PRIN',
  'Accountant': 'ACC',
  'Teacher': 'TCH',
  'Librarian': 'LIB',
  'Admin Staff': 'ADM',
  'Class Teacher': 'TCH'
};

export class IdGenerator {
  /**
   * Generates a unique school code from a name
   */
  static async suggestSchoolCodes(name: string): Promise<string[]> {
    const words = name.toUpperCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    const suggestions = new Set<string>();
    
    // Pattern 1: Initials
    const initials = words.map(w => w[0]).join('').substring(0, 4);
    suggestions.add(initials);

    // Pattern 2: First 3 letters of first word
    if (words[0].length >= 3) suggestions.add(words[0].substring(0, 3));
    
    // Pattern 3: First 4 letters of first word
    if (words[0].length >= 4) suggestions.add(words[0].substring(0, 4));

    // Filter available
    const available: string[] = [];
    for (const code of Array.from(suggestions)) {
      if (code.length < 2) continue;
      const exists = await prisma.school.findUnique({ where: { id: code } });
      if (!exists) available.push(code);
    }

    return available;
  }

  /**
   * generateStudentCode
   * Delegates to CounterService
   */
  static async generateStudentCode(schoolId: string, schoolCode: string, year: string, tx?: any): Promise<string> {
    return CounterService.generateStudentCode(schoolId, schoolCode, year, tx);
  }

  /**
   * generateStaffCode
   * Delegates to CounterService
   */
  static async generateStaffCode(schoolId: string, schoolCode: string, roleName: string, tx?: any): Promise<string> {
    const roleCode = ROLE_CODES[roleName] || 'USR';
    return CounterService.generateStaffCode({
      schoolId,
      schoolCode,
      role: roleCode
    }, tx);
  }

  /**
   * generateAdmissionNumber
   * Delegates to CounterService
   */
  static async generateAdmissionNumber(params: {
    schoolId: string;
    schoolCode: string;
    branchId: string;
    branchCode: string;
    year: string;
  }, tx?: any): Promise<string> {
    return CounterService.generateAdmissionNumber(params, tx);
  }

  /**
   * generateBranchId
   * Format: {SCH}-{BRANCH_CODE}{SEQ_2}
   * Example: VIVA-MAIN01, ELT-BLR01
   */
  static async generateBranchId(params: {
    schoolId: string;
    schoolCode: string;
    branchCode?: string; // e.g. MAIN, BLR, IND
  }, tx?: any): Promise<string> {
    const branchCode = (params.branchCode || "BR").toUpperCase();
    
    // We use a counter specific to this branch code prefix to ensure 01, 02 per location
    const seq = await CounterService.getNextSequence({
      schoolId: params.schoolId,
      type: `BRANCH_${branchCode}`,
      year: "GLOBAL"
    }, tx);

    return `${params.schoolCode}-${branchCode}${seq.toString().padStart(2, '0')}`;
  }
}
