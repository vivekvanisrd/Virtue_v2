const Razorpay = require('razorpay');
require('dotenv').config({ path: '.env' });

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log("Checking Razorpay Keys:");
console.log("Key ID:", keyId);
console.log("Key Secret Length:", keySecret ? keySecret.length : 0);

if (!keyId || !keySecret) {
    console.error("Error: Missing credentials in .env");
    process.exit(1);
}

const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
});

async function testAuth() {
    try {
        console.log("Attempting to list orders...");
        const orders = await razorpay.orders.all({ count: 1 });
        console.log("Success! Authentication works. Found", orders.items.length, "orders (limited to 1 count)");
    } catch (err) {
        console.error("Authentication Failed!");
        console.error("Error Details:", JSON.stringify(err, null, 2));
    }
}

testAuth();
