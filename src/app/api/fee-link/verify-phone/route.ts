import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

function normalizePhone(p: string) {
  return p.replace(/[\s\-+().]/g, "").replace(/^91/, "").slice(-10);
}

export async function POST(req: NextRequest) {
  try {
    const { token, phone } = await req.json();
    if (!token || !phone) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { data, error } = await supabase
      .from("fee_payment_links")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !data) return NextResponse.json({ error: "Invalid or expired payment link." }, { status: 404 });

    if (normalizePhone(data.phone) !== normalizePhone(phone)) {
      return NextResponse.json({ valid: false, error: "Phone number does not match. Please check and try again." });
    }

    const isUPI = data.razorpay_link_id?.startsWith("UPI_QR_") ?? false;
    let upiVpa = "";
    let upiMerchantName = "";
    let bankName = "";
    let bankAccountNo = "";
    let bankIfsc = "";

    try {
      const prisma = (await import("@/lib/prisma")).default;
      const schoolId = data.school_id || "VIVES";
      const branchId = data.branch_id || "VIVES-RCB";
      
      const vpaSetting = await prisma.globalSetting.findFirst({
        where: { schoolId, key: { in: [`BRANCH_${branchId}_UPI_VPA`, `BRANCH_${branchId}_UPIVPA`] } }
      });
      const nameSetting = await prisma.globalSetting.findFirst({
        where: { schoolId, key: { in: [`BRANCH_${branchId}_UPI_MERCHANT_NAME`, `BRANCH_${branchId}_UPIMERCHANTNAME`] } }
      });
      const bankNameSetting = await prisma.globalSetting.findFirst({
        where: { schoolId, key: { in: [`BRANCH_${branchId}_BANK_NAME`] } }
      });
      const bankAccSetting = await prisma.globalSetting.findFirst({
        where: { schoolId, key: { in: [`BRANCH_${branchId}_ACCOUNT_NUMBER`] } }
      });
      const bankIfscSetting = await prisma.globalSetting.findFirst({
        where: { schoolId, key: { in: [`BRANCH_${branchId}_IFSC_CODE`, `BRANCH_${branchId}_IFSC`] } }
      });

      upiVpa = vpaSetting?.value || "accounts@pava-edux.edu.in";
      upiMerchantName = nameSetting?.value || "PaVa-EDUX Academy";
      bankName = bankNameSetting?.value || "Yes Bank Ltd";
      bankAccountNo = bankAccSetting?.value || "000190100004829";
      bankIfsc = bankIfscSetting?.value || "YESB0000001";
    } catch (dbErr) {
      console.warn("Failed to load settings configuration:", dbErr);
    }

    return NextResponse.json({
      valid: true,
      studentName: data.student_name,
      parentName: data.parent_name,
      amount: data.amount,
      description: data.description,
      pendingItems: data.pending_items,
      razorpayShortUrl: data.razorpay_short_url,
      status: data.status,
      isMock: data.razorpay_link_id?.startsWith("MOCK_") ?? false,
      isUPI,
      upiVpa,
      upiMerchantName,
      bankName,
      bankAccountNo,
      bankIfsc
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
