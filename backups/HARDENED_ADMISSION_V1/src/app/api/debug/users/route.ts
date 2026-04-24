import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const staff = await prisma.staff.findMany({
            select: {
                firstName: true,
                lastName: true,
                role: true,
                email: true,
                username: true,
                branch: { select: { code: true } }
            }
        });

        const admins = await prisma.platformAdmin.findMany({
            select: {
                name: true,
                role: true,
                email: true,
                username: true
            }
        });

        return NextResponse.json({
            status: "success",
            disclaimer: "TEMPORARY DEBUG ROUTE - REMOVE AFTER USE",
            admins,
            staff
        });
    } catch (e: any) {
        return NextResponse.json({ status: "error", message: e.message });
    }
}
