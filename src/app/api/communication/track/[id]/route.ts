import { NextRequest, NextResponse } from "next/server";
import { prismaBypass } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (id) {
      // Find the log and check if it's not read yet
      const log = await prismaBypass.communicationLog.findUnique({
        where: { id },
        select: { isRead: true }
      });
      
      if (log && !log.isRead) {
        await prismaBypass.communicationLog.update({
          where: { id },
          data: {
            isRead: true,
            readAt: new Date()
          }
        });
      }
    }
  } catch (err) {
    console.error("Failed to track email open:", err);
  }

  // Return a 1x1 transparent PNG pixel
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", // GIF is even smaller and more compatible than PNG!
    "base64"
  );

  return new NextResponse(pixel, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}
