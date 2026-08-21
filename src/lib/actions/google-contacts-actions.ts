"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { cookies } from "next/headers";
import {
  getGoogleOAuthUrl,
  syncToGooglePeopleAPI,
  collectSchoolContacts,
  generateVCardExport,
  generateCSVExport,
  resolveOAuthCredentials
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

    const { clientId, clientSecret } = await resolveOAuthCredentials(schoolId);

    return {
      success: true,
      data: {
        isConnected: Boolean(integration?.isActive),
        userEmail: integration?.userEmail || null,
        lastSyncedAt: integration?.lastSyncedAt ? integration.lastSyncedAt.toISOString() : null,
        parentCount,
        staffCount,
        syncedMappingsCount,
        isOauthConfigured: Boolean(clientId && clientSecret),
        savedClientId: integration?.clientId || null
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

    const url = await getGoogleOAuthUrl(schoolId);
    return { success: true, url };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * ⚙️ Save Google OAuth Client Credentials directly in Portal UI
 */
export async function saveGoogleOAuthCredentialsAction(params: {
  clientId?: string;
  clientSecret?: string;
  jsonConfig?: string;
}) {
  try {
    const schoolId = await resolveSchoolIdContext();
    if (!schoolId) {
      return { success: false, error: "School context missing: No active school found in database." };
    }

    let targetClientId = params.clientId?.trim();
    let targetClientSecret = params.clientSecret?.trim();

    // Parse JSON config if uploaded/pasted directly
    if (params.jsonConfig && params.jsonConfig.trim().length > 0) {
      try {
        const parsed = JSON.parse(params.jsonConfig.trim());
        const web = parsed.web || parsed.installed || parsed;
        if (web.client_id) targetClientId = web.client_id;
        if (web.client_secret) targetClientSecret = web.client_secret;
      } catch (jsonErr) {
        return { success: false, error: "Invalid JSON format. Please paste a valid google-credentials.json object." };
      }
    }

    if (!targetClientId) {
      return { success: false, error: "Client ID is required." };
    }

    await prisma.googleIntegration.upsert({
      where: { schoolId },
      update: {
        clientId: targetClientId,
        ...(targetClientSecret ? { clientSecret: targetClientSecret } : {})
      },
      create: {
        schoolId,
        clientId: targetClientId,
        clientSecret: targetClientSecret || "",
        isActive: false
      }
    });

    return {
      success: true,
      message: "Google OAuth Credentials saved successfully in Portal Settings! You can now click Connect Google Account."
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save OAuth credentials." };
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
