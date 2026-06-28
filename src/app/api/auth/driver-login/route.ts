import { NextRequest, NextResponse } from "next/server";
import { signInDriverAction } from "@/lib/actions/transport-actions-v2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = body?.phone?.trim();
    const licenseNo = body?.licenseNo?.trim();
    const password = body?.password?.trim();
    const deviceId = body?.deviceId?.trim();

    if ((!phone && !licenseNo) || !password) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Phone/License number and Password are required." } },
        { status: 400 }
      );
    }

    const result = await signInDriverAction({ phone, licenseNo, password, deviceId, setCookie: true }) as any;

    if (!result.success) {
      const statusCode = result.error?.code === "ACCOUNT_LOCKED" ? 403 
                     : result.error?.code === "DEVICE_MISMATCH" ? 400 
                     : 401;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[DRIVER_LOGIN_ROUTE_ERROR]", error?.message);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error?.message || "Internal server error" } },
      { status: 500 }
    );
  }
}
