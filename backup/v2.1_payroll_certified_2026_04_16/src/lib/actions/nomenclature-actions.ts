"use server";

import { IdGenerator } from "../id-generator";
import prisma from "../prisma";

/**
 * PREDICATIVE ENGINE: Suggests available school codes from a name
 * Checks DB for collisions in real-time.
 */
export async function suggestSchoolCodesAction(name: string): Promise<{ success: boolean; codes: string[] }> {
  try {
    if (!name || name.length < 3) return { success: true, codes: [] };
    const codes = await IdGenerator.suggestSchoolCodes(name);
    return { success: true, codes };
  } catch (error: any) {
    return { success: false, codes: [] };
  }
}

/**
 * PREDICATIVE ENGINE: Validates if a specific branch code is already taken
 */
export async function checkBranchAvailabilityAction(schoolId: string, branchCode: string): Promise<{ available: boolean }> {
  try {
    const branchId = `${schoolId}-${branchCode.toUpperCase()}01`;
    const exists = await prisma.branch.findUnique({
      where: { id: branchId }
    });
    return { available: !exists };
  } catch {
    return { available: false };
  }
}
/**
 * PREDICATIVE ENGINE: Suggests branch codes based on city name
 * Example: Bangalore -> BLR, Mumbai -> MUM
 */
export async function suggestBranchCodesAction(city: string): Promise<{ success: boolean; codes: string[] }> {
  try {
    if (!city || city.length < 3) return { success: true, codes: [] };
    
    const clean = city.toUpperCase().trim();
    const suggestions = new Set<string>();
    
    // Pattern 1: First 3 letters
    suggestions.add(clean.substring(0, 3));
    
    // Pattern 2: Initials of words if multi-word (e.g. White Field -> WF)
    const words = clean.split(/\s+/);
    if (words.length > 1) {
        const initials = words.map(w => w[0]).join('').substring(0, 3);
        if (initials.length >= 2) suggestions.add(initials);
    }

    // Pattern 3: Consonants (e.g. Koramangala -> KRM)
    const consonants = clean.replace(/[AEIOU\s]/g, '').substring(0, 3);
    if (consonants.length >= 3) suggestions.add(consonants);

    return { success: true, codes: Array.from(suggestions) };
  } catch {
    return { success: false, codes: [] };
  }
}
