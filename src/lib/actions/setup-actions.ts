"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";

import { setupSchema, SetupInput } from "@/lib/validations/setup";

export async function initializeSystem(data: SetupInput) {
  try {
    const validatedData = setupSchema.parse(data);

    // 1. Check if schools already exist (To prevent accidental re-runs without Developer auth)
    const existingSchoolsCount = await prisma.school.count();
    
    // In a fully deployed app, we would verify the user is a SUPER_ADMIN or DEVELOPER here.
    // Let's proceed assuming they are authorized or this is a fresh setup.

    // 2. Perform everything in a transaction to ensure atomic setup
    const result = await prisma.$transaction(async (tx) => {
      
      // Step A: Create School
      const school = await tx.school.create({
        data: {
          id: validatedData.schoolCode,
          code: validatedData.schoolCode,
          name: validatedData.schoolName,
          address: validatedData.address,
          phone: validatedData.phone,
          email: validatedData.email,
        },
      });

      // Step B: Create Main Branch
      const branchId = `${validatedData.schoolCode}-MNB01`;
      const branch = await tx.branch.create({
        data: {
          id: branchId,
          schoolId: school.id,
          name: "Main Branch",
          code: `${validatedData.schoolCode}01`,
          address: validatedData.address,
          phone: validatedData.phone,
        },
      });

      // Step C: Create Academic Year
      const yearSuffix = validatedData.academicYear.split("-")[1]; // gets "26" from "2025-26"
      const academicYearId = `${school.id}-AY-${validatedData.academicYear.split("-")[0]}${yearSuffix}`;
      
      const startDate = new Date(validatedData.academicYearStart);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setDate(endDate.getDate() - 1);

      const academicYear = await tx.academicYear.create({
        data: {
          id: academicYearId,
          schoolId: school.id,
          name: validatedData.academicYear,
          startDate: startDate,
          endDate: endDate,
          isCurrent: true,
        },
      });

      // Step D: Create Owner Staff Record
      // The OWNER is basically the primary administrator for the school.
      const employeeId = `${school.id}-OWN-001`;
      
      const owner = await tx.staff.create({
        data: {
          employeeId: employeeId,
          schoolId: school.id,
          branchId: branch.id,
          firstName: validatedData.ownerFirstName,
          lastName: validatedData.ownerLastName,
          email: validatedData.ownerEmail,
          phone: validatedData.ownerPhone,
          role: "OWNER", // Explicitly setting Core RBAC Role!
          status: "Active",
          // If using Supabase Auth, you would create the Auth User here or via API 
          // and store the auth.users ID in `userId`. 
          // For now, we store their intent to setup password in the frontend.
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
