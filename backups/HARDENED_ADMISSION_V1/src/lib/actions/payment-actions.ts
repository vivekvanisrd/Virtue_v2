"use server";

import { razorpay } from "@/lib/razorpay";
import { getSovereignIdentity } from "../auth/backbone";

/**
 * createPaymentLinkAction
 * 
 * Generates a branded Razorpay Payment Link for student fee collection.
 */
export async function createPaymentLinkAction(details: {
  amount: number,
  studentId: string,
  studentName: string,
  email?: string,
  contact?: string,
  notes: string,
  terms: string[],
  baseAmount?: number,
  batchPayload?: string
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
    // Professional Fee Calculation: 1.5% Gateway Fee + 18% GST on the fee
    const baseAmount = details.amount;
    const gatewayFee = baseAmount * 0.015;
    const gst = gatewayFee * 0.18;
    const totalConvenience = gatewayFee + gst;
    const totalAmount = baseAmount + totalConvenience;

    // Dynamic Origin Detection for Callback
    let origin = process.env.NEXT_PUBLIC_APP_URL || 'https://virtue-psi.vercel.app';
    
    try {
      const { headers } = await import("next/headers");
      const host = (await headers()).get("host");
      if (host && !host.includes("localhost")) {
        origin = `https://${host}`;
      }
    } catch (e) {
      console.warn("[CALLBACK_ORIGIN_FALLBACK]", e);
    }

    // Create the payment link
    const response = await razorpay.paymentLink.create({
      amount: Math.round(totalAmount * 100), // Razorpay expects paise
      currency: "INR",
      accept_partial: false,
      first_min_partial_amount: 0,
      description: `Fees for ${details.studentName} (${details.terms.length} items)`,
      customer: {
        name: details.studentName,
        email: details.email || undefined,
        contact: details.contact || undefined
      },
      reference_id: details.studentId,
      notify: {
        sms: true,
        email: true
      },

      reminder_enable: true,
      notes: {
        studentId: details.studentId,
        schoolId: context.schoolId,
        terms: details.terms.join(","),
        batch: details.batchPayload || "",
        type: "FEE_COLLECTION",
        baseAmount: (details.baseAmount || details.amount).toFixed(2),
        convenienceFee: "1.5% + 18% GST",
        gatewayFee: gatewayFee.toFixed(2),
        gst: gst.toFixed(2)
      },
      callback_url: `${origin}/pay/verify`,
      callback_method: "get"
    });

    return { 
      success: true, 
      paymentLinkId: response.id,
      shortUrl: response.short_url,
      status: response.status 
    };

  } catch (error: any) {
    console.error("[RAZORPAY_LINK_ERROR_FULL]", JSON.stringify(error, null, 2));
    const detailedError = error.error?.description || error.message || "Unknown Razorpay Error";
    return { 
      success: false, 
      error: `Razorpay: ${detailedError}`
    };
  }
}
