import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const schoolId = req.headers.get("x-v2-school-id");
  const branchId = req.headers.get("x-v2-branch-id");
  if (!schoolId || !branchId) {
    return NextResponse.json({ error: "Missing tenancy context" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // 'sales' | 'catalog'
    const academicYearId = searchParams.get("academic_year_id");

    if (type === "sales") {
      // 1. Fetch paid checkout orders from fee_payment_links
      const paidCheckouts = await prisma.fee_payment_links.findMany({
        where: {
          school_id: schoolId,
          branch_id: branchId,
          status: "PAID",
        },
        orderBy: { paid_at: "desc" },
      });

      // 2. Fetch inventory issues (student ledger credits & manual issues)
      const issues = await prisma.inventory_issues.findMany({
        where: {
          school_id: schoolId,
          branch_id: branchId,
          ...(academicYearId ? { academic_year_id: academicYearId } : {}),
        },
        include: {
          inventory_issue_items: {
            include: {
              inventory_items: true,
            },
          },
        },
        orderBy: { issue_date: "desc" },
      });

      const students = await prisma.student.findMany({
        where: { schoolId, branchId },
        select: { id: true, firstName: true, lastName: true }
      });
      const classes = await prisma.class.findMany({
        where: { schoolId, branchId },
        select: { id: true, name: true }
      });

      const studentMap: Record<string, string> = {};
      students.forEach(s => {
        studentMap[s.id] = `${s.firstName || ""} ${s.lastName || ""}`.trim();
      });

      const classMap: Record<string, string> = {};
      classes.forEach(c => {
        classMap[c.id] = c.name;
      });

      return NextResponse.json({ paidCheckouts, issues, studentMap, classMap });
    } else if (type === "student") {
      const studentId = searchParams.get("student_id");
      if (!studentId) {
        return NextResponse.json({ error: "student_id is required for student reports" }, { status: 400 });
      }

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          studentCode: true,
          phone: true,
          family: {
            select: {
              fatherName: true,
              fatherPhone: true,
              motherPhone: true,
              motherName: true
            }
          },
          academic: {
            select: {
              class: { select: { name: true } },
              section: { select: { name: true } }
            }
          }
        }
      });

      const studentIssues = await prisma.inventory_issues.findMany({
        where: {
          school_id: schoolId,
          branch_id: branchId,
          student_id: studentId,
          ...(academicYearId ? { academic_year_id: academicYearId } : {}),
        },
        include: {
          inventory_issue_items: {
            include: {
              inventory_items: true,
            },
          },
        },
        orderBy: { issue_date: "desc" },
      });

      const studentReturns = await prisma.inventory_returns.findMany({
        where: {
          school_id: schoolId,
          branch_id: branchId,
          student_id: studentId,
          ...(academicYearId ? { academic_year_id: academicYearId } : {}),
        },
        include: {
          inventory_return_items: {
            include: {
              inventory_items: true,
            },
          },
        },
        orderBy: { return_date: "desc" },
      });

      let onlineCheckouts: any[] = [];
      if (student) {
        const studentFullName = `${student.firstName || ""} ${student.lastName || ""}`.trim();
        const phones = [
          student.phone,
          student.family?.fatherPhone,
          student.family?.motherPhone
        ].filter(Boolean) as string[];

        const orClauses: any[] = [
          { student_name: { contains: studentFullName, mode: "insensitive" } }
        ];
        if (student.firstName) {
          orClauses.push({ student_name: { contains: student.firstName, mode: "insensitive" } });
        }
        if (phones.length > 0) {
          orClauses.push({ phone: { in: phones } });
        }

        onlineCheckouts = await prisma.fee_payment_links.findMany({
          where: {
            school_id: schoolId,
            branch_id: branchId,
            status: "PAID",
            OR: orClauses
          },
          orderBy: { paid_at: "desc" }
        });
      }

      return NextResponse.json({
        student,
        issues: studentIssues,
        returns: studentReturns,
        checkouts: onlineCheckouts
      });
    } else if (type === "catalog") {
      // Fetch all catalog items including pre-assembled kit items
      const items = await prisma.inventory_items.findMany({
        where: { school_id: schoolId, branch_id: branchId },
        orderBy: { item_name: "asc" },
      });

      // Fetch all kits mapping
      const kits = await prisma.inventory_kits.findMany({
        where: { school_id: schoolId, branch_id: branchId },
        include: {
          inventory_kit_items: {
            include: {
              inventory_items: true,
            },
          },
        },
        orderBy: { kit_name: "asc" },
      });

      return NextResponse.json({ items, kits });
    }

    return NextResponse.json({ error: "Invalid report type requested." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
