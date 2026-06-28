const Razorpay = require('razorpay');
require('dotenv').config();

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error("Error: Razorpay credentials missing in environment variables.");
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

async function createLink() {
  const args = process.argv.slice(2);
  const amountStr = args[0];
  const name = args[1] || "Custom Payment";
  const email = args[2] || "billing@example.com";

  if (!amountStr) {
    console.log("Usage: node scratch/generate_quick_link.js <amount_in_rupees> [customer_name] [customer_email]");
    process.exit(1);
  }

  const baseAmount = parseFloat(amountStr);
  if (isNaN(baseAmount) || baseAmount <= 0) {
    console.error("Error: Invalid amount provided.");
    process.exit(1);
  }

  // 1.5% gateway fee + 18% GST on the fee
  const gatewayFee = baseAmount * 0.015;
  const gst = gatewayFee * 0.18;
  const totalAmount = baseAmount + gatewayFee + gst;
  const amountInPaise = Math.round(totalAmount * 100);

  console.log(`Generating payment link for:`);
  console.log(`- Base Amount: ₹${baseAmount}`);
  console.log(`- Gateway Convenience Fee (1.5% + 18% GST): ₹${(gatewayFee + gst).toFixed(2)}`);
  console.log(`- Total Billable: ₹${totalAmount.toFixed(2)} (${amountInPaise} paise)`);
  console.log(`- Name: ${name}`);
  console.log(`- Email: ${email}\n`);

  try {
    const response = await razorpay.paymentLink.create({
      amount: amountInPaise,
      currency: "INR",
      accept_partial: false,
      description: `Payment Link for ${name}`,
      customer: {
        name: name,
        email: email
      },
      notify: {
        sms: false,
        email: true
      },
      reminder_enable: false,
      notes: {
        type: "CUSTOM_FIXED_AMOUNT",
        baseAmount: baseAmount.toFixed(2),
        convenienceFee: (gatewayFee + gst).toFixed(2)
      }
    });

    console.log("✅ Payment Link Created Successfully!");
    console.log("-------------------------------------");
    console.log(`Short URL:  ${response.short_url}`);
    console.log(`Link ID:    ${response.id}`);
    console.log(`Status:     ${response.status}`);
    console.log("-------------------------------------");
  } catch (error) {
    console.error("❌ Razorpay Link Creation Failed:");
    console.error(error);
  }
}

createLink();
