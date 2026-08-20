import { prismaBypass as prisma } from "@/lib/prisma";

/**
 * 🌐 GOOGLE CONTACTS INTEGRATION & SYNC SERVICE
 * Provides:
 * 1. Google OAuth 2.0 URL generation & token exchange
 * 2. Google People API live contact syncing (Parents, Guardians, Staff)
 * 3. Instant vCard (.vcf) export for mobile device import
 * 4. Instant Google Contacts compatible CSV export
 */

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  message: string;
  errors?: string[];
}

export interface ContactItem {
  id: string;
  type: "PARENT" | "STAFF" | "GUARDIAN";
  firstName: string;
  lastName: string;
  displayName: string;
  phone?: string | null;
  secondaryPhone?: string | null;
  email?: string | null;
  organization: string;
  title: string;
  note: string;
}

// Default OAuth Constants (Can be overriden via ENV)
const DEFAULT_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const DEFAULT_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const DEFAULT_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3010/api/integrations/google/callback";

/**
 * 🔑 1. Generate Google OAuth Authorization URL
 */
export function getGoogleOAuthUrl(schoolId: string, redirectUri?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
  const targetRedirect = redirectUri || DEFAULT_REDIRECT_URI;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured in environment variables.");
  }

  const scopes = [
    "https://www.googleapis.com/auth/contacts",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
  ].join(" ");

  const state = Buffer.from(JSON.stringify({ schoolId })).toString("base64");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: targetRedirect,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * 🔄 2. Exchange OAuth Code for Tokens
 */
export async function handleGoogleOAuthCallback(code: string, schoolId: string, redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;
  const targetRedirect = redirectUri || DEFAULT_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth Client ID & Secret are required in environment variables.");
  }

  // 1. Token Exchange
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: targetRedirect,
      grant_type: "authorization_code"
    })
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`Failed to exchange Google OAuth code: ${errorText}`);
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in, scope } = tokenData;

  // 2. Fetch User Profile Email
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` }
  });

  let userEmail = "unknown@google.com";
  if (userRes.ok) {
    const userData = await userRes.json();
    userEmail = userData.email || userEmail;
  }

  const expiryDate = new Date(Date.now() + (expires_in || 3600) * 1000);

  // 3. Save / Upsert in Database
  const integration = await prisma.googleIntegration.upsert({
    where: { schoolId },
    create: {
      schoolId,
      userEmail,
      accessToken: access_token,
      refreshToken: refresh_token || null,
      tokenExpiry: expiryDate,
      scope: scope || null,
      isActive: true
    },
    update: {
      userEmail,
      accessToken: access_token,
      refreshToken: refresh_token || undefined,
      tokenExpiry: expiryDate,
      scope: scope || null,
      isActive: true,
      updatedAt: new Date()
    }
  });

  return integration;
}

/**
 * 🛡️ 3. Ensure Fresh Access Token
 */
export async function getValidAccessToken(schoolId: string): Promise<string | null> {
  const integration = await prisma.googleIntegration.findUnique({ where: { schoolId } });
  if (!integration || !integration.isActive) return null;

  // If token is valid for another 5 minutes, return it
  if (integration.tokenExpiry.getTime() > Date.now() + 5 * 60 * 1000) {
    return integration.accessToken;
  }

  // Refresh if token expired and refresh_token exists
  if (integration.refreshToken) {
    const clientId = process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: integration.refreshToken,
        grant_type: "refresh_token"
      })
    });

    if (res.ok) {
      const data = await res.json();
      const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);

      await prisma.googleIntegration.update({
        where: { schoolId },
        data: {
          accessToken: data.access_token,
          tokenExpiry: newExpiry,
          updatedAt: new Date()
        }
      });

      return data.access_token;
    }
  }

  return null;
}

/**
 * 📦 4. Collect All Contacts from ERP
 */
export async function collectSchoolContacts(
  schoolId: string,
  category: "parents" | "staff" | "all"
): Promise<ContactItem[]> {
  const items: ContactItem[] = [];

  // Fetch School Info
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const schoolName = school?.name || "Virtue ERP School";

  // A. Fetch Parents & Guardians
  if (category === "parents" || category === "all") {
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        isDeleted: false,
        status: { in: ["Active", "ACTIVE"] }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        email: true,
        family: {
          select: {
            fatherName: true,
            fatherPhone: true,
            fatherEmail: true,
            motherName: true,
            motherPhone: true,
            motherEmail: true,
            emergencyName: true,
            emergencyPhone: true
          }
        }
      }
    });

    for (const st of students) {
      const fam = st.family;
      const studentTag = `Parent of ${st.firstName} ${st.lastName || ""} (Adm #${st.admissionNumber || "N/A"})`.trim();

      // Father Contact
      if (fam?.fatherName || fam?.fatherPhone) {
        items.push({
          id: `parent-father-${st.id}`,
          type: "PARENT",
          firstName: fam.fatherName || `Father of ${st.firstName}`,
          lastName: st.lastName || "",
          displayName: `${fam.fatherName || "Father"} (F/O ${st.firstName} ${st.lastName || ""})`.trim(),
          phone: fam.fatherPhone,
          email: fam.fatherEmail || st.email,
          organization: schoolName,
          title: `Parent / Father of ${st.firstName}`,
          note: studentTag
        });
      }

      // Mother Contact (if distinct phone)
      if (fam?.motherName && fam?.motherPhone && fam.motherPhone !== fam.fatherPhone) {
        items.push({
          id: `parent-mother-${st.id}`,
          type: "PARENT",
          firstName: fam.motherName,
          lastName: st.lastName || "",
          displayName: `${fam.motherName} (M/O ${st.firstName} ${st.lastName || ""})`.trim(),
          phone: fam.motherPhone,
          email: fam.motherEmail,
          organization: schoolName,
          title: `Parent / Mother of ${st.firstName}`,
          note: studentTag
        });
      }

      // Emergency Contact (if distinct)
      if (fam?.emergencyName && fam?.emergencyPhone && fam.emergencyPhone !== fam.fatherPhone && fam.emergencyPhone !== fam.motherPhone) {
        items.push({
          id: `parent-emergency-${st.id}`,
          type: "GUARDIAN",
          firstName: fam.emergencyName,
          lastName: st.lastName || "",
          displayName: `${fam.emergencyName} (Emergency Contact - ${st.firstName})`.trim(),
          phone: fam.emergencyPhone,
          email: null,
          organization: schoolName,
          title: `Emergency Contact of ${st.firstName}`,
          note: studentTag
        });
      }
    }
  }

  // B. Fetch Staff & Teachers
  if (category === "staff" || category === "all") {
    const staffList = await prisma.staff.findMany({
      where: {
        schoolId,
        status: { in: ["Active", "ACTIVE"] }
      },
      select: {
        id: true,
        staffCode: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        department: { select: { name: true } }
      }
    });

    for (const emp of staffList) {
      const deptName = emp.department?.name || "Faculty";
      items.push({
        id: `staff-${emp.id}`,
        type: "STAFF",
        firstName: emp.firstName,
        lastName: emp.lastName || "",
        displayName: `${emp.firstName} ${emp.lastName || ""} [${emp.role || "Staff"}]`.trim(),
        phone: emp.phone,
        secondaryPhone: null,
        email: emp.email,
        organization: schoolName,
        title: `${emp.role || "Staff"} (${deptName})`,
        note: `Staff Code: ${emp.staffCode || "N/A"} | Department: ${deptName} | ${schoolName}`
      });
    }
  }

  return items;
}

/**
 * 📲 5. Generate vCard (.vcf) string for Mobile Import
 */
export async function generateVCardExport(schoolId: string, category: "parents" | "staff" | "all"): Promise<string> {
  const contacts = await collectSchoolContacts(schoolId, category);
  const vcardLines: string[] = [];

  for (const c of contacts) {
    if (!c.phone && !c.email) continue; // Skip empty contacts

    vcardLines.push("BEGIN:VCARD");
    vcardLines.push("VERSION:3.0");
    vcardLines.push(`FN:${c.displayName.replace(/;/g, "\\;")}`);
    vcardLines.push(`N:${c.lastName};${c.firstName};;;`);
    
    if (c.organization) {
      vcardLines.push(`ORG:${c.organization.replace(/;/g, "\\;")}`);
    }
    if (c.title) {
      vcardLines.push(`TITLE:${c.title.replace(/;/g, "\\;")}`);
    }
    if (c.phone) {
      const cleanPhone = c.phone.replace(/[^0-9+]/g, "");
      vcardLines.push(`TEL;TYPE=CELL:${cleanPhone}`);
    }
    if (c.secondaryPhone) {
      const cleanSecPhone = c.secondaryPhone.replace(/[^0-9+]/g, "");
      vcardLines.push(`TEL;TYPE=WORK,VOICE:${cleanSecPhone}`);
    }
    if (c.email) {
      vcardLines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
    }
    if (c.note) {
      vcardLines.push(`NOTE:${c.note.replace(/\n/g, " ").replace(/;/g, "\\;")}`);
    }
    vcardLines.push("END:VCARD");
  }

  return vcardLines.join("\r\n");
}

/**
 * 📊 6. Generate Google Contacts Compatible CSV
 */
export async function generateCSVExport(schoolId: string, category: "parents" | "staff" | "all"): Promise<string> {
  const contacts = await collectSchoolContacts(schoolId, category);
  
  const headers = [
    "Given Name",
    "Family Name",
    "Name",
    "Phone 1 - Type",
    "Phone 1 - Value",
    "Phone 2 - Type",
    "Phone 2 - Value",
    "E-mail 1 - Type",
    "E-mail 1 - Value",
    "Organization 1 - Name",
    "Organization 1 - Title",
    "Notes"
  ];

  const rows = [headers.map(h => `"${h}"`).join(",")];

  for (const c of contacts) {
    if (!c.phone && !c.email) continue;

    const row = [
      `"${(c.firstName || "").replace(/"/g, '""')}"`,
      `"${(c.lastName || "").replace(/"/g, '""')}"`,
      `"${(c.displayName || "").replace(/"/g, '""')}"`,
      `"Mobile"`,
      `"${(c.phone || "").replace(/"/g, '""')}"`,
      `"Work"`,
      `"${(c.secondaryPhone || "").replace(/"/g, '""')}"`,
      `"Work"`,
      `"${(c.email || "").replace(/"/g, '""')}"`,
      `"${(c.organization || "").replace(/"/g, '""')}"`,
      `"${(c.title || "").replace(/"/g, '""')}"`,
      `"${(c.note || "").replace(/"/g, '""')}"`
    ];

    rows.push(row.join(","));
  }

  return rows.join("\n");
}

/**
 * ☁️ 7. Push Contacts Directly to Google People API
 */
export async function syncToGooglePeopleAPI(
  schoolId: string,
  category: "parents" | "staff" | "all"
): Promise<SyncResult> {
  const accessToken = await getValidAccessToken(schoolId);
  if (!accessToken) {
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      message: "No active Google OAuth authorization found. Please connect your Google Account first."
    };
  }

  const contacts = await collectSchoolContacts(schoolId, category);
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const c of contacts) {
    if (!c.phone && !c.email) continue;

    try {
      // Check existing mapping
      const existingMapping = await prisma.googleContactMapping.findUnique({
        where: {
          schoolId_entityType_entityId: {
            schoolId,
            entityType: c.type,
            entityId: c.id
          }
        }
      });

      const body: any = {
        names: [
          {
            givenName: c.firstName,
            familyName: c.lastName,
            displayName: c.displayName
          }
        ],
        organizations: [
          {
            name: c.organization,
            title: c.title
          }
        ],
        biographies: [
          {
            value: c.note
          }
        ]
      };

      if (c.phone) {
        body.phoneNumbers = [
          {
            value: c.phone,
            type: "mobile"
          }
        ];
        if (c.secondaryPhone) {
          body.phoneNumbers.push({
            value: c.secondaryPhone,
            type: "work"
          });
        }
      }

      if (c.email) {
        body.emailAddresses = [
          {
            value: c.email,
            type: "work"
          }
        ];
      }

      let res: Response;

      if (existingMapping?.googleResourceName) {
        // UPDATE existing contact
        const resourceName = existingMapping.googleResourceName;
        res = await fetch(
          `https://people.googleapis.com/v1/${resourceName}:updateContact?updatePersonFields=names,phoneNumbers,emailAddresses,organizations,biographies`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
          }
        );
      } else {
        // CREATE new contact
        res = await fetch("https://people.googleapis.com/v1/people:createContact", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
      }

      if (res.ok) {
        const createdPerson = await res.json();
        const googleResourceName = createdPerson.resourceName;

        if (googleResourceName) {
          await prisma.googleContactMapping.upsert({
            where: {
              schoolId_entityType_entityId: {
                schoolId,
                entityType: c.type,
                entityId: c.id
              }
            },
            create: {
              schoolId,
              entityType: c.type,
              entityId: c.id,
              googleResourceName,
              lastSyncedAt: new Date()
            },
            update: {
              googleResourceName,
              lastSyncedAt: new Date()
            }
          });
        }
        synced++;
      } else {
        const errJson = await res.json();
        failed++;
        errors.push(`${c.displayName}: ${errJson.error?.message || "Failed to push to Google API"}`);
      }
    } catch (err: any) {
      failed++;
      errors.push(`${c.displayName}: ${err.message}`);
    }
  }

  // Update last synced date on integration record
  await prisma.googleIntegration.update({
    where: { schoolId },
    data: { lastSyncedAt: new Date() }
  });

  return {
    success: synced > 0 || failed === 0,
    syncedCount: synced,
    failedCount: failed,
    message: `Sync complete. ${synced} contacts synced successfully${failed > 0 ? `, ${failed} failed` : ""}.`,
    errors: errors.slice(0, 5)
  };
}
