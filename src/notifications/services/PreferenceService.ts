import { prismaBypass } from "@/lib/prisma";
import { EcpUserType, EcpChannelType } from "@prisma/client";

class EcpPreferenceService {
  async getUserPreference(businessId: string, userId: string, userType: EcpUserType, category: string, channel: EcpChannelType) {
    const db = prismaBypass as any;
    try {
      const pref = await db.userCommunicationPreference.findUnique({
        where: {
          businessId_userId_userType_category_channel: {
            businessId,
            userId,
            userType,
            category,
            channel
          }
        }
      });
      return pref ? pref.isEnabled : true; // Enabled by default
    } catch {
      return true; // Default fallback if preference table not yet initialized or query fails
    }
  }

  async setUserPreference(params: {
    businessId: string;
    userId: string;
    userType: EcpUserType;
    category: string;
    channel: EcpChannelType;
    isEnabled: boolean;
  }) {
    const db = prismaBypass as any;
    const { businessId, userId, userType, category, channel, isEnabled } = params;
    return await db.userCommunicationPreference.upsert({
      where: {
        businessId_userId_userType_category_channel: {
          businessId,
          userId,
          userType,
          category,
          channel
        }
      },
      update: { isEnabled },
      create: {
        businessId,
        userId,
        userType,
        category,
        channel,
        isEnabled
      }
    });
  }
}

export const PreferenceService = new EcpPreferenceService();
