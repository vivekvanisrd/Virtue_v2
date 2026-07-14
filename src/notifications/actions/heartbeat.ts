"use server";

import { prismaBypass } from "@/lib/prisma";

export async function heartbeatAction(deviceId: string) {
  try {
    const db = prismaBypass as any;
    
    // Updates lastSeenAt for active devices
    await db.pushDevice.updateMany({
      where: { deviceId },
      data: {
        lastSeenAt: new Date(),
        isActive: true
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Device Heartbeat Error:", error);
    return { success: false, error: error.message };
  }
}
