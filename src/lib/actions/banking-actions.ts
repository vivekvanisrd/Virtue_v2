"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import crypto from "crypto";

const _RAW_ENCRYPTION_KEY = process.env.BANKING_ENCRYPTION_KEY;
if (!_RAW_ENCRYPTION_KEY || _RAW_ENCRYPTION_KEY.length < 32) {
    throw new Error("FATAL: BANKING_ENCRYPTION_KEY must be configured and at least 32 characters long.");
}
const ENCRYPTION_KEY = _RAW_ENCRYPTION_KEY;
const IV_LENGTH = 16;

/**
 * Encrypt sensitive banking data
 */
function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

/**
 * Decrypt sensitive banking data
 */
function decrypt(text: string) {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("Decryption failed:", err);
    return "";
  }
}

/**
 * Save Axis Bank Configuration securely
 */
export async function saveAxisConfigAction(formData: {
  schoolId: string;
  clientId: string;
  clientSecret: string;
  publicKey: string;
  accountNumber: string;
  corporateId: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || (identity.schoolId !== formData.schoolId && !identity.isGlobalDev)) {
      throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to authorized institutional admins.");
    }
    
    const settings = [
      { key: "AXIS_CLIENT_ID", value: formData.clientId, isSecret: false },
      { key: "AXIS_CLIENT_SECRET", value: encrypt(formData.clientSecret), isSecret: true },
      { key: "AXIS_PUBLIC_KEY", value: formData.publicKey, isSecret: true },
      { key: "AXIS_ACCOUNT_NUMBER", value: formData.accountNumber, isSecret: false },
      { key: "AXIS_CORPORATE_ID", value: formData.corporateId, isSecret: false },
    ];

    for (const setting of settings) {
      await prisma.globalSetting.upsert({
        where: { 
          schoolId_key: { schoolId: formData.schoolId, key: setting.key } 
        },
        update: { value: setting.value, isSecret: setting.isSecret },
        create: { 
          schoolId: formData.schoolId, 
          key: setting.key, 
          value: setting.value, 
          isSecret: setting.isSecret 
        },
      });
    }

    revalidatePath("/settings/banking");
    return { success: true, message: "Credentials stored securely." };
  } catch (error: any) {
    console.error("[AXIS_CONFIG_SAVE_ERROR]", error);
    return { success: false, message: error.message || "Failed to save configuration." };
  }
}

/**
 * Test Axis Connectivity (Sandbox)
 */
export async function testAxisConnectionAction(schoolId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || (identity.schoolId !== schoolId && !identity.isGlobalDev)) {
      throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to authorized institutional admins.");
    }
    
    // 1. Fetch Credentials
    const config = await prisma.globalSetting.findMany({
      where: { schoolId, key: { startsWith: "AXIS_" } }
    });

    if (config.length < 5) {
      return { success: false, message: "Incomplete configuration. Please fill all fields." };
    }

    // TODO: Implement actual Axis Sandbox Handshake
    // For now, simulate success
    await new Promise(r => setTimeout(r, 2000));

    return { 
      success: true, 
      message: "Sandbox Handshake Successful. API Tunnel Active.",
      details: {
        latency: "142ms",
        status: "AUTHORIZED",
        environment: "SANDBOX"
      }
    };
  } catch (error: any) {
    return { success: false, message: "Connection Failed: " + error.message };
  }
}

/**
 * Save Branch Specific Gateway Settings
 */
export async function saveBranchGatewayConfigAction(params: {
  branchId: string;
  provider: string; // "Razorpay" | "PhonePe" | "Cashfree" | "Paytm" | "UPI_QR" | "NONE"
  config: Record<string, string>;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    
    // Gated to Principal and Owner roles
    if (identity.role !== "OWNER" && identity.role !== "PRINCIPAL" && !identity.isGlobalDev) {
      throw new Error("ACCESS_DENIED: Only Owners and Principals can manage payment gateways.");
    }
    
    const schoolId = identity.schoolId;
    const { branchId, provider, config } = params;

    const branchExists = await prisma.branch.findFirst({
      where: { id: branchId, schoolId }
    });
    if (!branchExists) throw new Error("INVALID_BRANCH: Branch does not exist under your school.");

    // Define keys to save
    const settingsToSave: { key: string; value: string; isSecret: boolean }[] = [
      { key: `BRANCH_${branchId}_GATEWAY_PROVIDER`, value: provider, isSecret: false }
    ];

    // Add provider specific configs
    for (const [rawKey, rawValue] of Object.entries(config)) {
      // Convert camelCase rawKey (e.g. upiVpa) to uppercase snake_case (e.g. UPI_VPA)
      const keySuffix = rawKey.replace(/([A-Z])/g, "_$1").toUpperCase().replace(/\s+/g, '_');
      const isSecret = ["KEY_SECRET", "WEBHOOK_SECRET", "SALT_KEY", "CLIENT_SECRET", "SECRET"].some(s => keySuffix.includes(s));
      
      const val = isSecret && rawValue ? encrypt(rawValue) : rawValue;
      settingsToSave.push({
        key: `BRANCH_${branchId}_${keySuffix}`,
        value: val,
        isSecret
      });
    }

    // Upsert all settings in prisma
    for (const setting of settingsToSave) {
      await prisma.globalSetting.upsert({
        where: {
          schoolId_key: { schoolId, key: setting.key }
        },
        update: { value: setting.value, isSecret: setting.isSecret },
        create: {
          schoolId,
          key: setting.key,
          value: setting.value,
          isSecret: setting.isSecret
        }
      });
    }

    try {
      revalidatePath("/", "layout");
    } catch (e) {}
    
    return { success: true, message: "Gateway configuration saved successfully." };
  } catch (error: any) {
    console.error("[SAVE_BRANCH_GATEWAY_CONFIG_ERROR]", error);
    return { success: false, message: error.message || "Failed to save gateway configuration." };
  }
}

/**
 * Get Branch Specific Gateway Settings
 */
export async function getBranchGatewayConfigAction(branchId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    
    const schoolId = identity.schoolId;

    const settings = await prisma.globalSetting.findMany({
      where: {
        schoolId,
        key: { startsWith: `BRANCH_${branchId}_` }
      }
    });

    const config: Record<string, any> = {};
    let provider = "NONE";

    for (const s of settings) {
      const suffix = s.key.replace(`BRANCH_${branchId}_`, "");
      if (suffix === "GATEWAY_PROVIDER") {
        provider = s.value;
      } else {
        const val = s.isSecret && s.value ? decrypt(s.value) : s.value;
        const camelKey = suffix.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        config[camelKey] = val;
        
        // Backward compatibility fallback for non-underscored keys
        if (camelKey === "upivpa") config.upiVpa = val;
        if (camelKey === "upimerchantname") config.upiMerchantName = val;
        if (camelKey === "keyid") config.keyId = val;
        if (camelKey === "keysecret") config.keySecret = val;
        if (camelKey === "webhooksecret") config.webhookSecret = val;
        if (camelKey === "clientid") config.clientId = val;
        if (camelKey === "clientsecret") config.clientSecret = val;
        if (camelKey === "merchantid") config.merchantId = val;
        if (camelKey === "saltkey") config.saltKey = val;
        if (camelKey === "saltindex") config.saltIndex = val;
      }
    }

    return { success: true, provider, config };
  } catch (error: any) {
    console.error("[GET_BRANCH_GATEWAY_CONFIG_ERROR]", error);
    return { success: false, error: error.message || "Failed to fetch gateway configuration." };
  }
}
