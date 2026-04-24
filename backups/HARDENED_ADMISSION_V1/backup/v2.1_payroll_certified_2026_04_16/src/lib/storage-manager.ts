import path from 'path';
import fs from 'fs';
import { getSovereignIdentity } from './auth/backbone';

/**
 * 🔒 STORAGE SENTINEL
 * Enforces Institutional Filesystem Isolation.
 */
export class StorageSentinel {
  private static readonly ROOT_DATA_DIR = path.join(process.cwd(), 'data');

  /**
   * 🏛️ GET SOVEREIGN FOLDER PATH
   * Returns the immutable path for a school's data node.
   * Throws if path traversal is detected or tenancy is violated.
   */
  static async getSchoolFolderPath(subPath: string = ''): Promise<string> {
    const tenant = await getSovereignIdentity();
    if (!tenant || !tenant.schoolId) {
      throw new Error("STORAGE_DENIED: No sovereign tenancy detected.");
    }

    const schoolId = tenant.schoolId;
    
    // 🛡️ RULE: Normalized Path Traversal Protection
    const normalizedSubPath = path.normalize(subPath);
    if (normalizedSubPath.startsWith('..') || path.isAbsolute(normalizedSubPath)) {
      throw new Error("SECURITY_BREACH: Path traversal attempt detected.");
    }

    // 🔒 RULE: Branch-Aware Physical Jail for STAFF
    if (tenant.role === 'STAFF' && tenant.branchId) {
       // Staff must be jailed within their branch subfolder
       const branchPrefix = `branches/${tenant.branchId}`;
       if (!normalizedSubPath.startsWith(branchPrefix) && normalizedSubPath !== branchPrefix) {
          // If the path doesn't start with their branch prefix, they are attempting a breach
          throw new Error(`SECURITY_BREACH: Branch storage violation for ${tenant.branchId}`);
       }
    }

    const fullPath = path.join(this.ROOT_DATA_DIR, schoolId, normalizedSubPath);

    // Ensure the institutional fortress exists
    if (!fs.existsSync(path.join(this.ROOT_DATA_DIR, schoolId))) {
      fs.mkdirSync(path.join(this.ROOT_DATA_DIR, schoolId), { recursive: true });
    }

    return fullPath;
  }

  /**
   * 🔍 VALIDATE ACCESS (Deep Scan)
   * Ensures the requested file belongs to the session school/branch.
   */
  static async validateAccess(filePath: string): Promise<boolean> {
    const tenant = await getSovereignIdentity();
    if (!tenant) return false;

    const normalizedPath = path.normalize(filePath);
    
    // 1. School Boundary
    const schoolPrefix = path.join(this.ROOT_DATA_DIR, tenant.schoolId);
    if (!normalizedPath.startsWith(schoolPrefix)) return false;

    // 2. Branch Boundary (for STAFF)
    if (tenant.role === 'STAFF' && tenant.branchId) {
       const branchPrefix = path.join(schoolPrefix, 'branches', tenant.branchId);
       return normalizedPath.startsWith(branchPrefix);
    }

    return true;
  }
}
