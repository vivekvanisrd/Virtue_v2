import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { InventoryService } from "@/lib/services/inventory-service";

// DEMO ONLY — simulates a successful payment without real Razorpay keys
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const data = await prisma.fee_payment_links.findUnique({
      where: { token },
      select: { razorpay_link_id: true, status: true }
    });
    if (!data) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    if (!data.razorpay_link_id?.startsWith("MOCK_")) return NextResponse.json({ error: "Mock pay only works in demo mode" }, { status: 400 });

    await prisma.fee_payment_links.update({
      where: { token },
      data: {
        status: "PAID",
        razorpay_payment_id: `MOCK_PAY_${Date.now()}`,
        paid_at: new Date()
      }
    });

    try {
      await InventoryService.reserveInventoryForPayment(token);
    } catch (resErr: any) {
      console.error("[MOCKPAY] Reservation trigger failed:", resErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
