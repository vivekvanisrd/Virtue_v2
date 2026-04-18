import { NextRequest, NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const { amount, studentId, studentName, notes } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `test_${Date.now()}`,
      notes: {
        studentId: studentId || "TEST_STUDENT",
        studentName: studentName || "Test Student",
        source: "TEST_PAY_LAB",
        ...(notes || {}),
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    });
  } catch (err: any) {
    console.error("[TEST_PAY] create-order error:", err);
    return NextResponse.json(
      { error: err.error?.description || err.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
