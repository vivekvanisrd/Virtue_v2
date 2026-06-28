import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth/session";
import crypto from "crypto";

// Token valid for 30 seconds
const TOKEN_TTL_SECONDS = 30;

function getSigningSecret(schoolId: string): string {
  const base = process.env.JWT_SECRET;
  if (!base) throw new Error("FATAL: JWT_SECRET not configured.");
  // Derive a school-specific signing secret so tokens from one school
  // cannot be replayed at another school.
  return crypto.createHmac("sha256", base).update(`QR_SIGNING:${schoolId}`).digest("hex");
}

export async function GET(req: NextRequest) {
  try {
    // Must be logged in as admin/principal/owner operating the kiosk screen
    const sessionCookie = (await cookies()).get("v-session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await decrypt(sessionCookie);
    if (!session?.schoolId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Only PRINCIPAL, OWNER, ADMIN can display the kiosk QR
    const allowedRoles = ["PRINCIPAL", "OWNER", "ADMIN"];
    if (!allowedRoles.includes(session.role as string)) {
      return NextResponse.json({ error: "Only Principal, Owner or Admin can operate the kiosk." }, { status: 403 });
    }

    const schoolId = session.schoolId as string;
    const timestamp = Math.floor(Date.now() / 1000);
    const secret = getSigningSecret(schoolId);

    // Sign: HMAC-SHA256(schoolId + timestamp, secret) → first 16 hex chars
    const payload = `${schoolId}:${timestamp}`;
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")
      .substring(0, 16)
      .toUpperCase();

    const token = `SOV2_${schoolId}_${timestamp}_${signature}`;

    return NextResponse.json({
      token,
      expiresIn: TOKEN_TTL_SECONDS,
      generatedAt: timestamp
    });
  } catch (error: any) {
    console.error("[GENERATE_TOKEN_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
