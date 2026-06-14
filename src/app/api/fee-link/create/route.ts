import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";

const ENCRYPTION_KEY = process.env.BANKING_ENCRYPTION_KEY || "virtue_default_dev_key_32_chars_!!";

function decrypt(text: string) {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentName, parentName, phone, amount, description, pendingItems } = body;

    if (!studentName || !parentName || !phone || !amount) {
      return NextResponse.json({ error: "Student name, parent name, phone and amount are required." }, { status: 400 });
    }

    const token = uuidv4();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const callbackUrl = `${baseUrl}/api/fee-link/verify`;

    // 1. Resolve tenancy context FIRST
    let schoolId = req.headers.get("x-v2-school-id") || body.schoolId;
    let branchId = req.headers.get("x-v2-branch-id") || body.branchId;

    if (!schoolId || !branchId) {
      try {
        const firstBranch = await prisma.branch.findFirst({ select: { id: true, schoolId: true } });
        if (firstBranch) {
          schoolId = schoolId || firstBranch.schoolId;
          branchId = branchId || firstBranch.id;
        }
      } catch (err) {
        console.warn("Fallback tenant lookup failed:", err);
      }
      if (!schoolId) schoolId = "VIVES";
      if (!branchId) branchId = "VIVES-RCB";
    }

    // 2. Fetch Active Branch Config
    let gatewayProvider = "NONE";
    let keyId = "";
    let keySecret = "";

    try {
      const providerSetting = await prisma.globalSetting.findFirst({
        where: { schoolId, key: `BRANCH_${branchId}_GATEWAY_PROVIDER` }
      });
      if (providerSetting) {
        gatewayProvider = providerSetting.value;
      }

      if (gatewayProvider === "Razorpay") {
        const rzpKeyId = await prisma.globalSetting.findFirst({
          where: { schoolId, key: { in: [`BRANCH_${branchId}_KEY_ID`, `BRANCH_${branchId}_KEYID`] } }
        });
        const rzpKeySecret = await prisma.globalSetting.findFirst({
          where: { schoolId, key: { in: [`BRANCH_${branchId}_KEY_SECRET`, `BRANCH_${branchId}_KEYSECRET`] } }
        });
        if (rzpKeyId && rzpKeySecret) {
          keyId = rzpKeyId.value;
          keySecret = decrypt(rzpKeySecret.value);
        }
      }
    } catch (dbErr) {
      console.warn("Failed to load branch payment gateway settings, falling back:", dbErr);
    }

    let razorpayLinkId: string | null = null;
    let razorpayShortUrl: string | null = null;
    let isMock = false;

    // 3. Process Checkout Logic based on Gateway Provider
    if (gatewayProvider === "UPI_QR") {
      // Custom UPI QR route: bypass Razorpay, parent pays via local bank QR
      razorpayLinkId = `UPI_QR_${token}`;
      razorpayShortUrl = `${baseUrl}/fee-pay/${token}`;
    } else if (gatewayProvider === "Razorpay" && keyId && keySecret) {
      // Use Custom Branch Razorpay Account
      try {
        const Razorpay = require("razorpay");
        const customRazorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const link = await (customRazorpay.paymentLink as any).create({
          amount: Math.round(parseFloat(amount) * 100),
          currency: "INR",
          description: description?.trim() || `Fee for ${studentName}`,
          reference_id: token,
          customer: { name: parentName, contact: phone },
          notify: { sms: false, email: false },
          callback_url: callbackUrl,
          callback_method: "get",
        });
        razorpayLinkId = link.id;
        razorpayShortUrl = link.short_url;
      } catch (rzpErr: any) {
        console.error("[CREATE] Branch custom Razorpay creation failed, fallback to mock:", rzpErr.message);
        isMock = true;
      }
    } else {
      // Fallback: Check Global Environment variables for Razorpay
      const globalKeyId = process.env.RAZORPAY_KEY_ID;
      const globalKeySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (globalKeyId && globalKeySecret && !globalKeyId.includes("PLACEHOLDER")) {
        try {
          const Razorpay = require("razorpay");
          const globalRzp = new Razorpay({ key_id: globalKeyId, key_secret: globalKeySecret });
          const link = await (globalRzp.paymentLink as any).create({
            amount: Math.round(parseFloat(amount) * 100),
            currency: "INR",
            description: description?.trim() || `Fee for ${studentName}`,
            reference_id: token,
            customer: { name: parentName, contact: phone },
            notify: { sms: false, email: false },
            callback_url: callbackUrl,
            callback_method: "get",
          });
          razorpayLinkId = link.id;
          razorpayShortUrl = link.short_url;
        } catch (rzpErr: any) {
          console.error("[CREATE] Global Razorpay creation failed, fallback to mock:", rzpErr.message);
          isMock = true;
        }
      } else {
        isMock = true;
      }
    }

    if (isMock) {
      razorpayLinkId = `MOCK_${token.slice(0, 8).toUpperCase()}`;
      razorpayShortUrl = `${baseUrl}/fee-pay/mock?token=${token}`;
    }

    // Save billing link details in supabase database table
    const { error: dbErr } = await supabase.from("fee_payment_links").insert({
      token,
      student_name: studentName.trim(),
      parent_name: parentName.trim(),
      phone: phone.trim(),
      amount: parseFloat(amount),
      description: description?.trim() || null,
      pending_items: pendingItems?.trim() || null,
      razorpay_link_id: razorpayLinkId,
      razorpay_short_url: razorpayShortUrl,
      status: "PENDING",
      school_id: schoolId,
      branch_id: branchId,
    });

    if (dbErr) throw new Error(dbErr.message);

    return NextResponse.json({
      success: true,
      token,
      shareableUrl: `${baseUrl}/fee-pay/${token}`,
      razorpayShortUrl,
      isMock,
    });
  } catch (err: any) {
    console.error("[CREATE] Fatal:", err.message);
    return NextResponse.json({ error: "Failed to create payment link. Please try again." }, { status: 500 });
  }
}
