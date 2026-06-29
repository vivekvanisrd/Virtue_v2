const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");

// Load .env.local first (to override .env if defined), then .env
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log("SMTP Config from environment:");
console.log("Host:", process.env.SMTP_HOST);
console.log("Port:", process.env.SMTP_PORT);
console.log("User:", process.env.SMTP_USER);
console.log("Pass length:", process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);
console.log("From Name:", process.env.SMTP_FROM_NAME);

async function main() {
  const host = process.env.SMTP_HOST || "smtp.hostinger.com";
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.error("Missing SMTP credentials in env!");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  try {
    console.log("Verifying transporter connection...");
    await transporter.verify();
    console.log("SMTP Transporter verified successfully!");
    
    console.log("Sending a test email...");
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Test'}" <${user}>`,
      to: user,
      subject: "Virtue School SMTP Test",
      text: "This is a test email to verify Hostinger SMTP setup.",
      html: "<b>This is a test email to verify Hostinger SMTP setup.</b>"
    });
    console.log("Email sent successfully! Message ID:", info.messageId);
  } catch (err) {
    console.error("SMTP error occurred:", err);
  }
}

main();
