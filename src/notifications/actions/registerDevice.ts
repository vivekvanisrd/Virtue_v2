"use server";

import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { prismaBypass } from "@/lib/prisma";
import { EcpUserType, EcpTokenStatus, EcpPushPlatform } from "@prisma/client";

export async function registerDeviceAction(params: {
  token: string;
  platform: EcpPushPlatform;
  deviceId: string;
  browser?: string;
  appVersion?: string;
  osVersion?: string;
}) {
  try {
    const identity = await getGuardianIdentity();
    if (!identity) {
      return { success: false, error: "SECURE_AUTH_REQUIRED: Guardian session expired." };
    }

    const db = prismaBypass as any;
    
    // Upsert the device registration matching [businessId, deviceId]
    const device = await db.pushDevice.upsert({
      where: {
        businessId_deviceId: {
          businessId: identity.schoolId,
          deviceId: params.deviceId
        }
      },
      update: {
        pushToken: params.token,
        userId: identity.guardianId,
        userType: EcpUserType.GUARDIAN,
        platform: params.platform,
        browser: params.browser || null,
        appVersion: params.appVersion || null,
        osVersion: params.osVersion || null,
        isActive: true,
        tokenStatus: EcpTokenStatus.ACTIVE,
        lastSeenAt: new Date()
      },
      create: {
        businessId: identity.schoolId,
        deviceId: params.deviceId,
        pushToken: params.token,
        userId: identity.guardianId,
        userType: EcpUserType.GUARDIAN,
        platform: params.platform,
        provider: "FCM_MOCK", // decoupled provider stub
        browser: params.browser || null,
        appVersion: params.appVersion || null,
        osVersion: params.osVersion || null,
        isActive: true,
        tokenStatus: EcpTokenStatus.ACTIVE,
        lastSeenAt: new Date()
      }
    });

    return { success: true, deviceId: device.id };
  } catch (error: any) {
    console.error("Register Device Error:", error);
    return { success: false, error: error.message || "Failed to register device." };
  }
}
