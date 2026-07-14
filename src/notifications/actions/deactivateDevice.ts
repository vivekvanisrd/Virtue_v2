"use server";

import { prismaBypass } from "@/lib/prisma";

export async function deactivateDeviceAction(deviceId: string) {
  try {
    const db = prismaBypass as any;
    
    // Marks device inactive (on logout) instead of hard-deleting (preserves logs)
    await db.pushDevice.updateMany({
      where: { deviceId },
      data: {
        isActive: false
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Deactivate Device Error:", error);
    return { success: false, error: error.message };
  }
}
