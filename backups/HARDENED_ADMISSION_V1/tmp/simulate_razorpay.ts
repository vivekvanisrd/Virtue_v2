/**
 * Razorpay Webhook Simulator (Virtue V2)
 * 
 * USE THIS TO TEST AUTOMATION LOCALLY WITHOUT NGOK/TUNNEL.
 * 
 * Instructions:
 * 1. Ensure your server is running on http://localhost:3000
 * 2. Run: npx ts-node tmp/simulate_razorpay.ts
 */

const fetch = require('node-fetch');

async function simulateCapture() {
    // ---- CONFIGURATION (Change these for the student you want to test) ----
    const studentId = "Studen2-S2-ID"; // Change to the real student UUID from your database
    const paymentId = "pay_SIMULATED_" + Math.random().toString(36).substring(7).toUpperCase();
    const bankRrn = "9999" + Math.floor(Math.random() * 100000000);
    const amountPaisa = 12721250; // ¥1,27,212.50
    const terms = "term2"; // The term being paid
    // -----------------------------------------------------------------------

    const payload = {
        event: "payment.captured",
        payload: {
            payment: {
                entity: {
                    id: paymentId,
                    amount: amountPaisa,
                    currency: "INR",
                    status: "captured",
                    order_id: "order_SIM_" + Date.now(),
                    invoice_id: null,
                    international: false,
                    method: "upi",
                    amount_refunded: 0,
                    refund_status: null,
                    captured: true,
                    description: "Simulated Local Payment",
                    card_id: null,
                    bank: "SIMULATED_BANK",
                    wallet: null,
                    vpa: "success@upi",
                    email: "local_test@virtue.academy",
                    contact: "+91 9123456789",
                    customer_id: null,
                    notes: {
                        studentId: studentId,
                        terms: terms,
                        type: "FEE_COLLECTION_V2_TAXED",
                        baseAmount: (amountPaisa / 100).toString()
                    },
                    acquirer_data: {
                        rrn: bankRrn,
                        upi_transaction_id: "UPI_" + bankRrn
                    },
                    created_at: Math.floor(Date.now() / 1000)
                }
            }
        }
    };

    console.log(`🚀 Simulating Webhook Capture for Student: ${studentId}...`);
    console.log(`💳 Payment ID: ${paymentId}`);
    console.log(`🏦 Bank RRN: ${bankRrn}`);

    try {
        const response = await fetch("http://localhost:3000/api/webhooks/razorpay", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-razorpay-simulation": "VIRTUE_SIM_FIX_369",
                "x-razorpay-signature": "SIMULATED_SIGNATURE"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log("------------------------------------------");
        if (response.ok) {
            console.log("✅ SUCCESS: Webhook processing completed.");
            console.log("🔗 You can now check the 'Razorpay Audit' report in the dashboard!");
        } else {
            console.log("❌ FAILED: ", result);
        }
    } catch (err) {
        console.error("❌ ERROR: Could not reach the local server. Is it running on port 3000?", err.message);
    }
}

simulateCapture();
