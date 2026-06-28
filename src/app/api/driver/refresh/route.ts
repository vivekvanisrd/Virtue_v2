import { NextRequest, NextResponse } from "next/server";
import { refreshDriverTokenAction } from "@/lib/actions/transport-actions-v2";
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

    const refreshToken = body.refreshToken || "";
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: { code: "REFRESH_TOKEN_REQUIRED", message: "Refresh token is required." } },
        { status: 400 }
      );
    }

    const key = `${ip}:${refreshToken.substring(0, 20)}`;

    // Rate Limiting: 10 requests per 60 seconds (Fail-Closed)
    const rateLimit = await checkRedisRateLimit("driver-refresh", key, 10, 60, true);
    if (!rateLimit.allowed) {
      const isServiceUnavailable = rateLimit.error === "RATE_LIMIT_UNAVAILABLE";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: rateLimit.error || "TOO_MANY_REQUESTS",
            message: isServiceUnavailable
              ? "Rate limit service is currently unavailable. Please try again later."
              : "Too many refresh attempts. Please try again in a minute."
          }
        },
        { status: isServiceUnavailable ? 503 : 429 }
      );
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const result = await refreshDriverTokenAction({
      refreshToken,
      ipAddress: ip,
      userAgent
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
