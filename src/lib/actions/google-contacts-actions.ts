"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { cookies } from "next/headers";
import {
  getGoogleOAuthUrl,
  syncToGooglePeopleAPI,
  collectSchoolContacts,
  generateVCardExport,
  generateCSVExport
} from "@/lib/services/google-contacts-service";

/**
 * 🏛️ Multi-Tenancy School Context Resolution Helper
 * Ensures schoolId is resolved across active sessions, tenant cookies, staff lookup, and multi-tenancy fallbacks.
 */
async function resolveSchoolIdContext(): Promise<string> {
  const identity = await getSovereignIdentity();
  let schoolId = identity?.schoolId;

  if (!schoolId || schoolId === "PLATFORM") {
    const cookieStore = await cookies();
    schoolId = cookieStore.get('v-active-school')?.value;
  }

  if ((!schoolId || schoolId === "PLATFORM") && identity?.staffId) {
    const staff = await prisma.staff.findUnique({
      where: { id: identity.staffId },
      select: { schoolId: true }
    });
    if (staff?.schoolId) schoolId = staff.schoolId;
  }

  if (!schoolId || schoolId === "PLATFORM") {
    const defaultSchool = await prisma.school.findFirst({ select: { id: true } });
    if (defaultSchool) schoolId = defaultSchool.id;
  }

  return schoolId || "";
}

/**
 * 📊 1. Get Integration Status & Statistics
 */
export async function getGoogleContactsIntegrationStatusAction() {
  try {
    const schoolId = await resolveSchoolIdContext();

    if (!schoolId) {
      return { success: false, error: "School context missing: No active school found in database." };
    }

    const integration = await prisma.googleIntegration.findUnique({
      where: { schoolId }
    });

    const parentCount = await prisma.student.count({
      where: { schoolId, status: "ACTIVE" }
    });

    const staffCount = await prisma.staff.count({
      where: { schoolId, status: "ACTIVE" }
    });

    const syncedMappingsCount = await prisma.googleContactMapping.count({
      where: { schoolId }
    });

    return {
      success: true,
      data: {
        isConnected: Boolean(integration?.isActive),
        userEmail: integration?.userEmail || null,
        lastSyncedAt: integration?.lastSyncedAt ? integration.lastSyncedAt.toISOString() : null,
        parentCount,
        staffCount,
        syncedMappingsCount,
        isOauthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID)
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch status" };
  }
}

/**
 * 🔑 2. Get OAuth Connect URL
 */
export async function getGoogleOAuthUrlAction() {
  try {
    const schoolId = await resolveSchoolIdContext();
    if (!schoolId) {
      return { success: false, error: "School context missing: No active school found in database." };
    }

    const url = getGoogleOAuthUrl(schoolId);
    return { success: true, url };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 🔄 3. Trigger Live Google People API Sync
 */
export async function triggerGoogleContactsSyncAction(category: "parents" | "staff" | "all") {
  try {
    const schoolId = await resolveSchoolIdContext();
    if (!schoolId) {
      return { success: false, error: "School context missing: No active school found in database." };
    }

    const result = await syncToGooglePeopleAPI(schoolId, category);
    return { success: result.success, message: result.message, details: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 🔌 4. Disconnect Google Integration
 */
export async function disconnectGoogleIntegrationAction() {
  try {
    const schoolId = await resolveSchoolIdContext();
    if (!schoolId) {
      return { success: false, error: "School context missing: No active school found in database." };
    }

    await prisma.googleIntegration.deleteMany({
      where: { schoolId }
    });

    return { success: true, message: "Google Integration disconnected successfully." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 📲 5. Export Contacts as vCard String
 */
export async function exportVCardAction(category: "parents" | "staff" | "all") {
  try {
    const schoolId = await resolveSchoolIdContext();
    if (!schoolId) {
      return { success: false, error: "School context missing: No active school found in database." };
    }

    const content = await generateVCardExport(schoolId, category);
    return { success: true, content, filename: `virtue_contacts_${category}.vcf` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 📊 6. Export Contacts as CSV String
 */
export async function exportCSVAction(category: "parents" | "staff" | "all") {
  try {
    const schoolId = await resolveSchoolIdContext();
    if (!schoolId) {
      return { success: false, error: "School context missing: No active school found in database." };
    }

    const content = await generateCSVExport(schoolId, category);
    return { success: true, content, filename: `virtue_contacts_${category}.csv` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
