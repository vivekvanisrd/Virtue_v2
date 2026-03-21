"use server";

import prisma from "../prisma";
import { createClient } from "../supabase/server";
import { revalidatePath } from "next/cache";

const SUPER_ADMIN_EMAILS = ["vivekvanisrd@gmail.com"];

async function checkSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !SUPER_ADMIN_EMAILS.includes(user.email || "")) {
    throw new Error("Unauthorized: Super Admin access required");
  }
  return user;
}

export async function createSchoolAction(formData: {
  schoolId: string;
  name: string;
  code: string;
  branchName: string;
  branchCode: string;
  adminEmail: string;
}) {
  try {
    await checkSuperAdmin();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create School
      const school = await tx.school.create({
        data: {
          id: formData.schoolId,
          name: formData.name,
          code: formData.code,
        },
      });

      // 2. Create Initial Branch
      const branchId = `${formData.schoolId}-BR-01`;
      const branch = await tx.branch.create({
        data: {
          id: branchId,
          schoolId: school.id,
          name: formData.branchName,
          code: formData.branchCode,
        },
      });

      // 3. Create Admin Staff/User stub
      // In this version, we assume the admin will sign up/login with this email
      // and the multi-tenancy logic will link them via the Staff record.
      const staff = await tx.staff.create({
        data: {
          employeeId: "ADMIN-001",
          firstName: "School",
          lastName: "Admin",
          email: formData.adminEmail,
          role: "OWNER",
          schoolId: school.id,
          branchId: branch.id,
          status: "Active",
        },
      });

      return { school, branch, staff };
    });

    revalidatePath("/super-admin");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Create School Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getAllSchoolsAction() {
  try {
    await checkSuperAdmin();
    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: {
            branches: true,
            students: true,
            staff: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: schools };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
