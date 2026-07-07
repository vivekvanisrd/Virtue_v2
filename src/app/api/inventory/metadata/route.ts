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
    const fetchStudents = searchParams.get("students") === "true";
    const studentSearch = searchParams.get("q") || "";

    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: "desc" },
    });

    const classes = await prisma.class.findMany({
      where: { schoolId, branchId },
      include: { sections: true },
      orderBy: { level: "asc" },
    });

    let students: any[] = [];
    if (fetchStudents) {
      const rawStudents = await prisma.student.findMany({
        where: {
          schoolId,
          branchId,
          status: "CONFIRMED",
          isDeleted: false,
          ...(studentSearch ? {
            OR: [
              { firstName: { contains: studentSearch, mode: "insensitive" } },
              { lastName: { contains: studentSearch, mode: "insensitive" } },
              { admissionNumber: { contains: studentSearch, mode: "insensitive" } },
              { studentCode: { contains: studentSearch, mode: "insensitive" } },
              { legacyId: { contains: studentSearch, mode: "insensitive" } }
            ]
          } : {})
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          studentCode: true,
          legacyId: true,
          academic: {
            select: {
              classId: true,
              sectionId: true,
              class: { select: { name: true } },
              section: { select: { name: true } }
            }
          }
        },
        take: 50,
      });

      students = rawStudents.map((s: any) => ({
        id: s.id,
        name: `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        admissionNo: s.admissionNumber || s.studentCode || "",
        classId: s.academic?.classId || "",
        sectionId: s.academic?.sectionId || "",
        className: s.academic?.class?.name || "",
        sectionName: s.academic?.section?.name || "",
      }));
    }

    return NextResponse.json({
      academicYears: academicYears.map((ay: any) => ({
        id: ay.id,
        name: ay.name,
        isCurrent: ay.isCurrent,
      })),
      classes: classes.map((c: any) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        sections: c.sections.map((s: any) => ({
          id: s.id,
          name: s.name,
        })),
      })),
      students,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
