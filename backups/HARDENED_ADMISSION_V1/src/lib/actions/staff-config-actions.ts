"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Institutional Staff Configuration Actions
 * 
 * Handles dynamic management of Departments and Role Categories (Nature of Role).
 * Tenancy is automatically enforced via the prisma-tenancy extension.
 */

// --- DEPARTMENTS ---

export async function getDepartments(schoolId: string) {
  try {
    const departments = await prisma.staffDepartment.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: departments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createDepartment(schoolId: string, name: string) {
  try {
    const dept = await prisma.staffDepartment.create({
      data: { name, schoolId }
    });
    revalidatePath("/dashboard/staff");
    return { success: true, data: dept };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDepartment(id: string) {
  try {
    await prisma.staffDepartment.delete({
      where: { id }
    });
    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- CATEGORIES (NATURE OF ROLE) ---

export async function getStaffCategories(schoolId: string) {
  try {
    const categories = await prisma.staffCategory.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: categories };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createStaffCategory(schoolId: string, name: string) {
  try {
    const cat = await prisma.staffCategory.create({
      data: { name, schoolId }
    });
    revalidatePath("/dashboard/staff");
    return { success: true, data: cat };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteStaffCategory(id: string) {
  try {
    await prisma.staffCategory.delete({
      where: { id }
    });
    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Pre-seeder for Institutions
 * Automatically adds standard defaults if the lists are empty.
 */
export async function seedDefaultsIfEmpty(schoolId: string) {
  try {
    const [depts, cats] = await Promise.all([
      prisma.staffDepartment.count({ where: { schoolId } }),
      prisma.staffCategory.count({ where: { schoolId } })
    ]);

    if (depts === 0) {
      const standardDepts = ["Academics", "Finance", "HR", "Operations", "Transport"];
      await prisma.staffDepartment.createMany({
        data: standardDepts.map(name => ({ name, schoolId }))
      });
    }

    if (cats === 0) {
      const standardCats = ["Teacher", "Management", "Administration", "Support"];
      await prisma.staffCategory.createMany({
        data: standardCats.map(name => ({ name, schoolId }))
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
