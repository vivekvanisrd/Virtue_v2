import { NextRequest, NextResponse } from "next/server";
import { signInDriverAction } from "@/lib/actions/transport-actions-v2";
import { checkRedisRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    let body;
    try {
      body = await req.json();
    } catch (_) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_JSON", message: "Request body must be a valid JSON." } },
        { status: 400 }
      );
    }

    const phone = body.phone?.trim() || "";
    const licenseNo = body.licenseNo?.trim() || "";
    const key = `${ip}:${phone || licenseNo}`;

    // Rate Limiting: 5 requests per 60 seconds (Fail-Closed)
    const rateLimit = await checkRedisRateLimit("driver-login", key, 5, 60, true);
    if (!rateLimit.allowed) {
      const isServiceUnavailable = rateLimit.error === "RATE_LIMIT_UNAVAILABLE";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: rateLimit.error || "TOO_MANY_REQUESTS",
            message: isServiceUnavailable
              ? "Rate limit service is currently unavailable. Please try again later."
              : "Too many login attempts. Please try again in a minute."
          }
        },
        { status: isServiceUnavailable ? 503 : 429 }
      );
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const result = await signInDriverAction({
      ...body,
      ipAddress: ip,
      userAgent,
      setCookie: true
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: err.message || "An unexpected error occurred." } },
      { status: 500 }
    );
  }
}
