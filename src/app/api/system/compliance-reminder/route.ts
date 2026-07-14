import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * COMPLIANCE REMINDER CRON ENDPOINT
 * 
 * Runs daily (via Vercel Cron or manual trigger) to identify students
 * who are past the 30-day grace period with missing compliance data
 * and sends reminder emails to their parents.
 * 
 * Idempotent: will not re-send if a COMPLIANCE_REMINDER was already sent
 * for a student within the last 7 days.
 * 
 * Trigger: GET /api/system/compliance-reminder
 * Auth: Vercel cron secret or manual admin hit
 */

const GRACE_PERIOD_DAYS = 30;
const REMINDER_COOLDOWN_DAYS = 7;

export async function GET(req: NextRequest) {
  try {
    // Optional: Verify cron secret for production security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Find all schools (multi-tenant support)
    const schools = await prisma.school.findMany({ select: { id: true, name: true } });

    let totalProcessed = 0;
    let totalEmailed = 0;
    let totalSkipped = 0;
    const results: any[] = [];

    for (const school of schools) {
      // 2. Find students created more than 30 days ago with missing compliance data
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - GRACE_PERIOD_DAYS);

      const incompleteStudents = await prisma.student.findMany({
        where: {
          schoolId: school.id,
          status: { in: ["CONFIRMED", "ACTIVE", "PROVISIONAL"] },
          createdAt: { lt: cutoffDate },
          OR: [
            { aadhaarNumber: null },
            { aadhaarNumber: "" },
          ]
        },
        include: {
          family: { select: { fatherEmail: true, motherEmail: true, fatherPhone: true, fatherName: true, motherAadhaar: true } },
          academic: { select: { apaarId: true, class: { select: { name: true } }, section: { select: { name: true } } } },
        }
      });

      for (const student of incompleteStudents) {
        totalProcessed++;

        // Build list of missing fields
        const missingFields: string[] = [];
        if (!student.aadhaarNumber) missingFields.push("Student Aadhaar Number");
        if (!student.academic?.apaarId) missingFields.push("APAAR / PEN Registry ID");
        if (!student.family?.fatherPhone) missingFields.push("Father/Guardian Contact Number");
        if (!student.family?.motherAadhaar) missingFields.push("Mother's Aadhaar Number");

        if (missingFields.length === 0) {
          totalSkipped++;
          continue; // All compliance data present
        }

        // Resolve parent email
        const parentEmail = student.family?.fatherEmail || student.family?.motherEmail;
        if (!parentEmail || !parentEmail.includes("@")) {
          totalSkipped++;
          continue; // No valid email to send to
        }

        // 3. Idempotency check — skip if reminder was sent within last 7 days
        const cooldownDate = new Date();
        cooldownDate.setDate(cooldownDate.getDate() - REMINDER_COOLDOWN_DAYS);

        const recentReminder = await prisma.communicationLog.findFirst({
          where: {
            schoolId: school.id,
            recipient: parentEmail,
            type: "COMPLIANCE_REMINDER",
            createdAt: { gte: cooldownDate },
            subject: { contains: student.firstName }
          }
        });

        if (recentReminder) {
          totalSkipped++;
          continue; // Already notified recently
        }

        // 4. Send reminder email
        const { NotificationService } = await import("@/lib/services/notification-service");

        const enrollmentAge = Math.floor((Date.now() - new Date(student.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const className = student.academic?.class?.name || "N/A";
        const sectionName = student.academic?.section?.name || "";
        const parentName = student.family?.fatherName || "Parent";

        const subject = `Action Required: Missing Documents for ${student.firstName} ${student.lastName || ""}`;
        const body = `Dear ${parentName},\n\n` +
          `We hope this message finds you well.\n\n` +
          `This is a reminder that the following mandatory documents for your ward, ` +
          `${student.firstName} ${student.lastName || ""} (Class ${className}${sectionName ? `-${sectionName}` : ""}), ` +
          `are still pending submission. The 30-day grace period from the date of admission has now expired (${enrollmentAge} days since enrollment).\n\n` +
          `Missing Documents:\n` +
          missingFields.map(f => `• ${f}`).join("\n") +
          `\n\nPlease visit the school office at your earliest convenience to submit the missing documents. ` +
          `Failure to provide these may result in restricted access to certain school services.\n\n` +
          `If you have already submitted these documents, please disregard this message or contact the administration for clarification.\n\n` +
          `Thank you for your prompt attention to this matter.`;

        const sent = await NotificationService.sendCustomEmail(
          parentEmail,
          subject,
          body,
          { schoolId: school.id, type: "COMPLIANCE_REMINDER" }
        );

        if (sent) {
          totalEmailed++;
          results.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName || ""}`,
            parentEmail,
            missingFields,
            enrollmentAge
          });
        }
      }
    }

    console.log(`✅ [COMPLIANCE_CRON] Processed: ${totalProcessed}, Emailed: ${totalEmailed}, Skipped: ${totalSkipped}`);

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed,
        totalEmailed,
        totalSkipped,
        timestamp: new Date().toISOString()
      },
      details: results
    });

  } catch (error: any) {
    console.error("❌ [COMPLIANCE_CRON] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
