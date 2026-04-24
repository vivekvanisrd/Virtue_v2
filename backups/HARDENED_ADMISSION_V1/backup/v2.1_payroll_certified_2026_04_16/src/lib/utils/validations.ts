/**
 * Global utility functions for data sanitization and validation.
 */

import { z } from "zod";

/**
 * String Normalization Utilities
 */
export const trim = (v: string | null | undefined) => v?.trim() || "";
export const toUpperCase = (v: string | null | undefined) => v?.trim().toUpperCase() || "";
export const toLowerCase = (v: string | null | undefined) => v?.trim().toLowerCase() || "";
export const toTitleCase = (v: string | null | undefined) => {
  if (!v) return "";
  return v
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};


/**
 * Sanitizes Date strings (DD/MM/YYYY or DD-MM-YYYY)
 */
export function sanitizeDate(val: string | null | undefined): Date | null {
    if (!val || val.trim() === '') return null;
    const parts = val.split(/[/-]/);
    if (parts.length === 3) {
        let day = parseInt(parts[0]);
        let month = parseInt(parts[1]) - 1;
        let year = parseInt(parts[2]);
        
        // Handle typos
        if (day > 31) day = parseInt(day.toString().substring(0, 2));
        if (month > 11) month = 5; // Default to June if invalid

        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

/**
 * Sanitizes Aadhaar numbers (removes spaces, parses scientific notation)
 */
export function sanitizeAadhaar(val: string | null | undefined): string | null {
    if (!val || val.trim() === '') return null;
    if (val.includes('E+')) {
        return Number(val).toLocaleString('fullwide', { useGrouping: false });
    }
    return val.replace(/\s/g, ''); 
}

export function sanitizePhone(val: string | null | undefined): string | null {
    if (!val || val.trim() === '') return null;
    let cleaned = val.replace(/[^\d]/g, '');
    
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        cleaned = cleaned.slice(2);
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
        cleaned = cleaned.slice(1);
    }
    
    return cleaned.length === 10 ? cleaned : null;
}

/**
 * Sanitizes Email Addresses using strict regex.
 */
export function sanitizeEmail(val: string | null | undefined): string | null {
    if (!val || val.trim() === '') return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val) ? val.trim().toLowerCase() : null;
}

/**
 * Global Zod Validation Blueprints
 */
export const globalPhoneSchema = z.string()
  .regex(/^[6-9]\d{9}$/, "Phone number must be exactly 10 digits and start with 6-9");

export const globalEmailSchema = z.string()
  .email("Invalid email format");

export const globalAadhaarSchema = z.string()
  .regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits");
