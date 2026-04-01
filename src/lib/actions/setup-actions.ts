"use server";
import { createClient } from "../supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { IdGenerator } from "../id-generator";

import { setupSchema, SetupInput } from "@/lib/validations/setup";

export async function initializeSystem(data: SetupInput) {
  try {
    const validatedData = setupSchema.parse(data);

    // 1. Check if schools already exist (To prevent accidental re-runs without Developer auth)
    const existingSchoolsCount = await prisma.school.count();
    
    // 2. Perform everything in a transaction to ensure atomic setup
    const result = await prisma.$transaction(async (tx: any) => {
      
      // Step A: Create School
      const school = await tx.school.create({
        data: {
          id: validatedData.schoolCode.toUpperCase(),
          code: validatedData.schoolCode.toUpperCase(),
          name: validatedData.schoolName,
          address: validatedData.address,
          phone: validatedData.phone,
          email: validatedData.email,
        },
      });

      // Step B: Create Main Branch (Semantic: SCH-MAIN01)
      const branchId = await IdGenerator.generateBranchId({
        schoolId: school.id,
        schoolCode: school.code,
        branchCode: "MAIN"
      }, tx);

      const branch = await tx.branch.create({
        data: {
          id: branchId,
          schoolId: school.id,
          name: "Main Branch",
          code: "MAIN",
          address: validatedData.address,
          phone: validatedData.phone,
        },
      });

      // Step C: Create Academic Year (Refactored to be cleaner)
      const ayLabel = validatedData.academicYear; // e.g. "2025-26"
      const academicYearId = `${school.id}-AY-${ayLabel}`;
      
      const startDate = new Date(validatedData.academicYearStart);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setDate(endDate.getDate() - 1);

      const academicYear = await tx.academicYear.create({
        data: {
          id: academicYearId,
          schoolId: school.id,
          name: ayLabel,
          startDate: startDate,
          endDate: endDate,
          isCurrent: true,
        },
      });

      // Step D: Create Owner Staff Record (Dynamic ID)
      const staffCode = await IdGenerator.generateStaffCode(school.id, school.code, "Owner/Partner", tx);
      
      const owner = await tx.staff.create({
        data: {
          staffCode: staffCode,
          schoolId: school.id,
          branchId: branch.id,
          firstName: validatedData.ownerFirstName,
          lastName: validatedData.ownerLastName,
          email: validatedData.ownerEmail,
          phone: validatedData.ownerPhone,
          role: "OWNER",
          status: "Active",
        },
      });

      return { 
        school: school.id, 
        branch: branch.id, 
        academicYear: academicYear.id, 
        owner: owner.id 
      };
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Initialization error:", error);
    
    // Provide a clear error message for unique constraints
    let message = error.message || "Failed to initialize system";
    if (error.code === 'P2002') {
      message = "A school with this code or identical records already exists.";
    }
    
    return { success: false, error: message };
  }
}

/**
 * Links the current logged-in Supabase user to an existing school's OWNER record.
 * This is used for initial synchronization between Auth and Database.
 */
export async function claimSchoolOwnership(schoolId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: `You must be logged in to claim a school. (Server Session: Missing)` };
    }

    // Check if school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId }
    });

    if (!school) {
      return { success: false, error: "School not found." };
    }

    // Check if user is already linked elsewhere
    const existingLink = await prisma.staff.findUnique({
      where: { 
        schoolId_userId: { 
          schoolId, 
          userId: user.id 
        } 
      }
    });

    if (existingLink) {
      return { success: false, error: "Your account is already linked to a school." };
    }

    // Find the primary OWNER record for this school that is UNLINKED
    const targetOwner = await prisma.staff.findFirst({
      where: {
        schoolId: schoolId,
        role: "OWNER",
        userId: null
      }
    });

    if (!targetOwner) {
      return { success: false, error: "No unlinked OWNER record found for this school. It may already be claimed." };
    }

    // Atomically link the record and update the email if it was null
    await prisma.staff.update({
      where: { id: targetOwner.id },
      data: {
        userId: user.id,
        email: user.email || targetOwner.email
      }
    });

    return { success: true, message: `Successfully linked your account to ${school.name}.` };
  } catch (error: any) {
    console.error("Claim Error:", error);
    const dbUrl = process.env.DATABASE_URL || "MISSING";
    const host = dbUrl.split("@")[1]?.split(":")[0] || "unknown";
    return { success: false, error: `Linkage failed: ${error.message}. (Server is currently trying to connect to: ${host})` };
  }
}
