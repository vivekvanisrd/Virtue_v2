"use server";

import { prismaBypass } from "@/lib/prisma";

export async function unregisterDeviceAction(deviceId: string) {
  try {
    const db = prismaBypass as any;
    
    // Hard deletes device token from table
    await db.pushDevice.deleteMany({
      where: { deviceId }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Unregister Device Error:", error);
    return { success: false, error: error.message };
  }
}
