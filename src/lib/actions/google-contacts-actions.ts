"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import {
  getGoogleOAuthUrl,
  syncToGooglePeopleAPI,
  collectSchoolContacts,
  generateVCardExport,
  generateCSVExport
} from "@/lib/services/google-contacts-service";

/**
 * 📊 1. Get Integration Status & Statistics
 */
export async function getGoogleContactsIntegrationStatusAction() {
  try {
    const identity = await getSovereignIdentity();
    const schoolId = identity.schoolId;

    if (!schoolId) {
      return { success: false, error: "School context missing" };
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
    const identity = await getSovereignIdentity();
    if (!identity.schoolId) {
      return { success: false, error: "School context missing" };
    }

    const url = getGoogleOAuthUrl(identity.schoolId);
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
    const identity = await getSovereignIdentity();
    if (!identity.schoolId) {
      return { success: false, error: "School context missing" };
    }

    const result = await syncToGooglePeopleAPI(identity.schoolId, category);
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
    const identity = await getSovereignIdentity();
    if (!identity.schoolId) {
      return { success: false, error: "School context missing" };
    }

    await prisma.googleIntegration.deleteMany({
      where: { schoolId: identity.schoolId }
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
    const identity = await getSovereignIdentity();
    if (!identity.schoolId) {
      return { success: false, error: "School context missing" };
    }

    const content = await generateVCardExport(identity.schoolId, category);
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
    const identity = await getSovereignIdentity();
    if (!identity.schoolId) {
      return { success: false, error: "School context missing" };
    }

    const content = await generateCSVExport(identity.schoolId, category);
    return { success: true, content, filename: `virtue_contacts_${category}.csv` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
