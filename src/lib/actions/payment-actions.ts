"use server";

import Razorpay from "razorpay";
import { getTenantContext } from "../utils/tenant-context";

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
  terms: string[]
}) {
  try {
    const context = await getTenantContext();
    
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return { success: false, error: "Razorpay credentials not configured in environment." };
    }

    const instance = new Razorpay({
      key_id,
      key_secret
    });

    // Create the payment link
    const response = await instance.paymentLink.create({
      amount: Math.round(details.amount * 100), // Razorpay expects paise
      currency: "INR",
      accept_partial: false,
      first_min_partial_amount: 0,
      description: `Fees for ${details.studentName} - ${details.notes}`,
      customer: {
        name: details.studentName,
        email: details.email || undefined,
        contact: details.contact || undefined
      },
      notify: {
        sms: true,
        email: true
      },
      reminder_enable: true,
      notes: {
        studentId: details.studentId,
        schoolId: context.schoolId,
        terms: details.terms.join(","),
        type: "FEE_COLLECTION"
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?tab=finance&status=success`,
      callback_method: "get"
    });

    return { 
      success: true, 
      paymentLinkId: response.id,
      shortUrl: response.short_url,
      status: response.status 
    };

  } catch (error: any) {
    console.error("Razorpay Link Error:", error);
    return { success: false, error: error.message || "Failed to generate payment link" };
  }
}
