import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/lib/services/inventory-service";

export async function GET(req: NextRequest) {
  const schoolId = req.headers.get("x-v2-school-id");
  const branchId = req.headers.get("x-v2-branch-id");
  if (!schoolId || !branchId) {
    return NextResponse.json({ error: "Missing tenancy context" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academic_year_id");
    const itemId = searchParams.get("item_id") || undefined;

    if (!academicYearId) {
      return NextResponse.json({ error: "academic_year_id query parameter is required" }, { status: 400 });
    }

    const stock = await InventoryService.getLiveStock({
      schoolId,
      branchId,
      academicYearId,
      itemId,
    });

    return NextResponse.json({ stock });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
