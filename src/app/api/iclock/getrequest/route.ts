import { NextRequest, NextResponse } from "next/server";
import { prismaBypass } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * ZKTeco/BioMax ADMS Biometric Push Protocol - GetRequest Endpoint
 * Path: /api/iclock/getrequest
 * 
 * The device pings this endpoint periodically (heartbeat) to report status
 * and request pending commands.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sn = searchParams.get("SN");

    if (!sn) {
      console.warn("[iClock GetRequest] Missing SN parameter");
      return new NextResponse("FAIL: Missing SN", {
        status: 400,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Update last ping time for the device if it exists
    const device = await prismaBypass.biometricDevice.findUnique({
      where: { deviceCode: sn }
    });

    if (device) {
      await prismaBypass.biometricDevice.update({
        where: { id: device.id },
        data: { lastPingAt: new Date() }
      });
      console.log(`[iClock GetRequest] Device ${sn} pinged. Marked Online.`);
    } else {
      console.log(`[iClock GetRequest] Unknown device ${sn} pinged.`);
    }

    // Standard ADMS response when there are no commands: "OK"
    return new NextResponse("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  } catch (error: any) {
    console.error("[iClock GetRequest Error]", error);
    return new NextResponse("FAIL", {
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
}

/**
 * Handle POST request for commands receipt or device option confirmation.
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sn = searchParams.get("SN");
    
    console.log(`[iClock GetRequest POST] Device ${sn} sent a post back`);

    return new NextResponse("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  } catch (error: any) {
    console.error("[iClock GetRequest POST Error]", error);
    return new NextResponse("FAIL", {
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
}
