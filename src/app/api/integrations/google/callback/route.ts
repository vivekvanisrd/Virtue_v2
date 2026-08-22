import { NextRequest, NextResponse } from "next/server";
import { handleGoogleOAuthCallback } from "@/lib/services/google-contacts-service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const baseUrl = req.nextUrl.origin;
  const redirectUrl = new URL("/dashboard?tab=google-contacts", baseUrl);

  if (error) {
    redirectUrl.searchParams.set("error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    redirectUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    let schoolId = "";
    if (state) {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      schoolId = decoded.schoolId || "";
    }

    if (!schoolId) {
      redirectUrl.searchParams.set("error", "missing_school_id");
      return NextResponse.redirect(redirectUrl);
    }

    const currentOrigin = req.nextUrl.origin;
    const callbackUri = `${currentOrigin}/api/integrations/google/callback`;

    await handleGoogleOAuthCallback(code, schoolId, callbackUri);

    redirectUrl.searchParams.set("success", "google_connected");
    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    console.error("Google OAuth callback error:", err);
    redirectUrl.searchParams.set("error", encodeURIComponent(err.message || "oauth_failed"));
    return NextResponse.redirect(redirectUrl);
  }
}
