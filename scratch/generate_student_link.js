const Razorpay = require('razorpay');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const localEnv = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnv)) {
  const localConfig = dotenv.parse(fs.readFileSync(localEnv));
  for (const k in localConfig) {
    process.env[k] = localConfig[k];
  }
}

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error("Error: Razorpay API keys are missing in the environment variables.");
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

async function main() {
  const studentId = "d2ed0f29-29a8-4aed-8249-95167202ccdd";
  const baseAmount = 13000;
  const studentName = "Nakkala Manu sri";
  const schoolId = "VIVES";
  const terms = ["Tuition"]; // default term

  // Fee calculation: 1.5% gateway fee + 18% GST on the fee
  const gatewayFee = baseAmount * 0.015; // 195
  const gst = gatewayFee * 0.18; // 35.1
  const convenience = gatewayFee + gst; // 230.1
  const totalAmount = baseAmount + convenience; // 13230.1
  const amountInPaise = Math.round(totalAmount * 100);

  // Dynamic origin detection callback url
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://virtue-psi.vercel.app";

  console.log(`Generating payment link for student:`);
  console.log(`- Student ID:   ${studentId}`);
  console.log(`- Student Name: ${studentName}`);
  console.log(`- School ID:    ${schoolId}`);
  console.log(`- Base Amount:  ₹${baseAmount}`);
  console.log(`- Gateway Fee:  ₹${gatewayFee.toFixed(2)}`);
  console.log(`- GST (18%):    ₹${gst.toFixed(2)}`);
  console.log(`- Convenience:  ₹${convenience.toFixed(2)}`);
  console.log(`- Total Amount: ₹${totalAmount.toFixed(2)} (${amountInPaise} paise)`);
  console.log(`- Callback URL: ${origin}/pay/verify\n`);

  try {
    const response = await razorpay.paymentLink.create({
      amount: amountInPaise,
      currency: "INR",
      accept_partial: false,
      description: `School Fees for ${studentName} - Amount: ₹${baseAmount}`,
      customer: {
        name: studentName,
        email: "finance@vives.in"
      },
      reference_id: `${studentId.slice(0, 20)}_${Date.now()}`,
      notify: {
        sms: false,
        email: true
      },
      reminder_enable: false,
      notes: {
        studentId: studentId,
        schoolId: schoolId,
        terms: terms.join(","),
        type: "FEE_COLLECTION",
        baseAmount: baseAmount.toFixed(2),
        convenienceFee: "1.5% + 18% GST",
        gatewayFee: gatewayFee.toFixed(2),
        gst: gst.toFixed(2)
      },
      callback_url: `${origin}/pay/verify`,
      callback_method: "get"
    });

    console.log("✅ Payment Link Created Successfully!");
    console.log("--------------------------------------------------");
    console.log(`Short URL:  ${response.short_url}`);
    console.log(`Link ID:    ${response.id}`);
    console.log(`Status:     ${response.status}`);
    console.log("--------------------------------------------------");
  } catch (error) {
    console.error("❌ Razorpay Link Creation Failed:");
    console.error(error);
  }
}

main();
