import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error("[RAZORPAY] CRITICAL: API Keys missing.");
  throw new Error("Razorpay API keys are missing in environment variables.");
}

// Basic format check to prevent common copy-paste errors
if (keySecret.length < 20) {
  console.warn("[RAZORPAY] WARNING: Key Secret seems unusually short. Authentication may fail.");
}

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});
