import { prismaBypass } from "@/lib/prisma";
import { EcpUserType, EcpTokenStatus } from "@prisma/client";

class EcpDeviceService {
  async getActiveUserDevices(userId: string, userType: EcpUserType) {
    const db = prismaBypass as any;
    return await db.pushDevice.findMany({
      where: {
        userId,
        userType,
        isActive: true,
        tokenStatus: EcpTokenStatus.ACTIVE
      }
    });
  }

  async invalidateToken(tokenId: string) {
    const db = prismaBypass as any;
    await db.pushDevice.update({
      where: { id: tokenId },
      data: {
        tokenStatus: EcpTokenStatus.INVALID,
        isActive: false
      }
    });
  }

  async runDailyTokenCleanup() {
    const db = prismaBypass as any;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete invalid tokens that haven't been seen for 30 days
    await db.pushDevice.deleteMany({
      where: {
        tokenStatus: EcpTokenStatus.INVALID,
        lastSeenAt: { lt: thirtyDaysAgo }
      }
    });
  }
}

export const DeviceService = new EcpDeviceService();
