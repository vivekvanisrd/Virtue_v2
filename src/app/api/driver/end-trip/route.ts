import { NextRequest, NextResponse } from "next/server";
import { endTripAction, verifyDriverSession } from "@/lib/actions/transport-actions-v2";
import { checkRedisRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || "";
    const payload = await verifyDriverSession(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid session." } },
        { status: 401 }
      );
    }

    // Rate Limiting: 3 requests per 60 seconds (Fail-Open)
    const rateLimit = await checkRedisRateLimit("driver-end-trip", payload.driverId, 3, 60, false);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: { code: "TOO_MANY_REQUESTS", message: "Too many end trip requests. Please wait." } },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (_) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_JSON", message: "Request body must be a valid JSON." } },
        { status: 400 }
      );
    }

    const { tripSessionId } = body;
    if (!tripSessionId) {
      return NextResponse.json(
        { success: false, error: { code: "TRIP_SESSION_ID_REQUIRED", message: "tripSessionId is required." } },
        { status: 400 }
      );
    }

    const result = await endTripAction(tripSessionId, token);
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
