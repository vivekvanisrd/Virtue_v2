import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

// During build or SSG, environment variables might be missing. 
// We use placeholders to prevent the build worker from crashing during module instantiation.
if (!keyId || !keySecret) {
  console.warn("[RAZORPAY] WARNING: API Keys missing. Payment operations will fail. (Expected during build/SSG if keys are not in build-worker context)");
}

const safeKeyId = keyId || "PLACEHOLDER_FOR_BUILD";
const safeKeySecret = keySecret || "PLACEHOLDER_FOR_BUILD";

// Basic format check to prevent common copy-paste errors
if (safeKeySecret.length < 10) {
  console.warn("[RAZORPAY] WARNING: Key Secret seems unusually short.");
}

export const razorpay = new Razorpay({
  key_id: safeKeyId,
  key_secret: safeKeySecret,
});
