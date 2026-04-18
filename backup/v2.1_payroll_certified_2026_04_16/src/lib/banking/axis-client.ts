"use server";

import crypto from "crypto";

/**
 * Axis Bank Neo Corporate API Core Client
 * Handles Request Signing, AES Encryption, and RSA Handshake
 */
export class AxisClient {
  private clientId: string;
  private clientSecret: string;
  private publicKey: string;

  constructor(config: { clientId: string; clientSecret: string; publicKey: string }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.publicKey = config.publicKey;
  }

  /**
   * Generates an HmacSHA256 signature for the request payload
   */
  private generateSignature(payload: string, timestamp: string) {
    const data = `${this.clientId}${timestamp}${payload}`;
    return crypto
      .createHmac("sha256", this.clientSecret)
      .update(data)
      .digest("hex");
  }

  /**
   * RSA Encrypts the Session Key for secure transit to Axis
   */
  private encryptSessionKey(sessionKey: string) {
    const buffer = Buffer.from(sessionKey);
    return crypto.publicEncrypt(
      {
        key: this.publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      buffer
    ).toString("base64");
  }

  /**
   * Prepares a Secure Request (Signing & Encryption)
   */
  public async prepareRequest(body: any, endpoint: string) {
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify(body);
    const signature = this.generateSignature(payload, timestamp);

    // Dynamic Session Key for AES
    const sessionKey = crypto.randomBytes(32).toString("hex");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(sessionKey.slice(0, 32)), iv);
    
    let encryptedBody = cipher.update(payload, "utf8", "base64");
    encryptedBody += cipher.final("base64");

    return {
      endpoint,
      headers: {
        "X-Axis-Client-ID": this.clientId,
        "X-Axis-Timestamp": timestamp,
        "X-Axis-Signature": signature,
        "X-Axis-Session-Key": this.encryptSessionKey(sessionKey),
        "X-Axis-IV": iv.toString("base64"),
        "Content-Type": "application/json"
      },
      body: encryptedBody
    };
  }

  /**
   * Initiates a Corporate Payout (Salary/Transfer)
   */
  public async initiatePayout(data: {
    beneficiaryAccount: string;
    beneficiaryIfsc: string;
    amount: number;
    paymentMode: "IMPS" | "NEFT";
    remarks: string;
  }) {
    const request = await this.prepareRequest({
      transferType: data.paymentMode,
      beneficiaryAccount: data.beneficiaryAccount,
      beneficiaryIFSC: data.beneficiaryIfsc,
      amount: data.amount,
      purpose: data.remarks,
      transferCurrency: "INR"
    }, "/payments/transfer");

    console.log("[AXIS_CLIENT] Initiating Payout to:", data.beneficiaryAccount);
    
    // In Production: return fetch(request.endpoint, ...)
    return { success: true, txnId: `AXS_${Date.now()}`, status: "IN_PROGRESS" };
  }
}
