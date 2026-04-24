import fs from 'fs';
import path from 'path';

const DATA_ROOT = path.join(process.cwd(), 'data');
const SCHOOLS_DIR = path.join(DATA_ROOT, 'schools');
const BRANCHES_DIR = path.join(DATA_ROOT, 'branches');

// 🛡️ Ensure directories exist
if (!fs.existsSync(SCHOOLS_DIR)) fs.mkdirSync(SCHOOLS_DIR, { recursive: true });
if (!fs.existsSync(BRANCHES_DIR)) fs.mkdirSync(BRANCHES_DIR, { recursive: true });

export interface SchoolRecord {
  id: string; // Internal UUID
  name: string;
  code: string; // Unique Immutable Code (e.g. SRIV)
  affiliationBoard: string;
  affiliationNumber: string;
  registrationNumber?: string;
  udiseCode?: string;
  country: string;
  state: string;
  district?: string;
  currencyCode: string;
  timezone: string;
  academicStartMonth: string;
  defaultLanguage: string;
  status: 'ACTIVE' | 'SETUP' | 'SUSPENDED';
  ownerFullName: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface BranchRecord {
  id: string;
  schoolId: string; // Reference to School.id
  schoolCode: string; // Reference to School.code
  name: string;
  code: string; // Unique within school (e.g. SANG)
  isMainBranch: boolean;
  status: 'ACTIVE' | 'CLOSED' | 'INACTIVE';
  addressLine1?: string;
  city?: string;
  pincode?: string;
  state?: string;
  lat?: number;
  lng?: number;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

/** 
 * 🧬 DATA SERVICE - Institutional DNA Persistence
 */
export const DataService = {
  // --- SCHOOLS ---
  async getSchools(): Promise<SchoolRecord[]> {
    if (!fs.existsSync(SCHOOLS_DIR)) return [];
    const files = fs.readdirSync(SCHOOLS_DIR).filter(f => f.endsWith('.json'));
    return files.map(f => JSON.parse(fs.readFileSync(path.join(SCHOOLS_DIR, f), 'utf-8')));
  },

  async saveSchool(school: SchoolRecord) {
    const filePath = path.join(SCHOOLS_DIR, `${school.code.toUpperCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(school, null, 2), 'utf-8');
    
    // Ensure branch folder exists
    const branchFolderPath = path.join(BRANCHES_DIR, school.code.toUpperCase());
    if (!fs.existsSync(branchFolderPath)) fs.mkdirSync(branchFolderPath, { recursive: true });
  },

  // --- BRANCHES ---
  async getBranches(schoolCode: string): Promise<BranchRecord[]> {
    const branchDir = path.join(BRANCHES_DIR, schoolCode.toUpperCase());
    if (!fs.existsSync(branchDir)) return [];
    
    const files = fs.readdirSync(branchDir).filter(f => f.endsWith('.json'));
    return files.map(f => JSON.parse(fs.readFileSync(path.join(branchDir, f), 'utf-8')));
  },

  async saveBranch(schoolCode: string, branch: BranchRecord) {
    const branchDir = path.join(BRANCHES_DIR, schoolCode.toUpperCase());
    if (!fs.existsSync(branchDir)) fs.mkdirSync(branchDir, { recursive: true });
    
    const filePath = path.join(branchDir, `${branch.code.toUpperCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(branch, null, 2), 'utf-8');
  }
};
