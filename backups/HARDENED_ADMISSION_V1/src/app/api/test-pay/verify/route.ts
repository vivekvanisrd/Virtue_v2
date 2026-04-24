import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { razorpay } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  const log: string[] = [];
  const step = (msg: string) => { log.push(msg); console.log("[TEST_PAY_VERIFY]", msg); };

  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();

    step(`Received: payment=${razorpay_payment_id}, order=${razorpay_order_id}`);

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ success: false, log, error: "Missing params" }, { status: 400 });
    }

    // ── 1. Verify signature (uses KEY_SECRET, not webhook secret) ──
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      step("❌ RAZORPAY_KEY_SECRET missing in env!");
      return NextResponse.json({ success: false, log, error: "Server config error" }, { status: 500 });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = crypto.createHmac("sha256", keySecret).update(body).digest("hex");

    if (expectedSig !== razorpay_signature) {
      step(`❌ Signature MISMATCH. Expected: ${expectedSig.slice(0, 10)}... Got: ${razorpay_signature.slice(0, 10)}...`);
      return NextResponse.json({ success: false, log, error: "Signature mismatch" }, { status: 403 });
    }
    step("✅ Signature verified!");

    // ── 2. Idempotency check ──
    const existing = await prisma.collection.findFirst({
      where: { paymentReference: razorpay_payment_id },
    });
    if (existing) {
      step(`ℹ️ Already recorded: receipt #${existing.receiptNumber}`);
      return NextResponse.json({ success: true, log, alreadyRecorded: true, receipt: existing.receiptNumber });
    }
    step("✅ No duplicate. Proceeding to record...");

    // ── 3. Fetch full payment from Razorpay ──
    const payment: any = await razorpay.payments.fetch(razorpay_payment_id);
    step(`✅ Payment fetched: ₹${payment.amount / 100}, status=${payment.status}, method=${payment.method}`);

    const notes = payment.notes || {};
    const studentId = notes.studentId;
    step(`Notes: studentId=${studentId || "MISSING"}, source=${notes.source || "?"}`);

    // ── 4. Find student (if real studentId provided) ──
    let schoolId = "VIVA"; // fallback
    let branchId = "GLOBAL";
    let activeFY: any = null;
    let studentName = notes.studentName || "Test Student";

    if (studentId && studentId !== "TEST_STUDENT") {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) {
        step(`❌ Student not found: ${studentId}`);
        return NextResponse.json({ success: false, log, error: "Student not found" }, { status: 404 });
      }
      schoolId = student.schoolId;
      studentName = `${student.firstName} ${student.lastName}`;
      step(`✅ Student found: ${studentName}, school=${schoolId}`);
      const branch = await prisma.branch.findFirst({ where: { schoolId } });
      branchId = branch?.id || "GLOBAL";
      activeFY = await prisma.financialYear.findFirst({ where: { schoolId, isCurrent: true } });
      if (!activeFY) {
        step(`❌ No active financial year for school: ${schoolId}`);
        return NextResponse.json({ success: false, log, error: "No active FY" }, { status: 422 });
      }
      step(`✅ FY: ${activeFY.name}`);
    } else {
      step(`⚠️ TEST_STUDENT mode — finding a real student to attach the test record...`);
      // studentId cannot be null per schema — find the first real student
      const anyStudent = await prisma.student.findFirst({ include: { school: true } });
      if (!anyStudent) {
        step(`❌ No students in DB at all. Cannot record.`);
        return NextResponse.json({ success: false, log, error: "No students in DB" }, { status: 422 });
      }
      // Override studentId with a real one for test
      const resolvedStudent = anyStudent;
      schoolId = resolvedStudent.schoolId;
      studentName = `${resolvedStudent.firstName} ${resolvedStudent.lastName} [TEST]`;
      step(`✅ Using test student: ${studentName} (${resolvedStudent.id})`);
      const branch = await prisma.branch.findFirst({ where: { schoolId } });
      branchId = branch?.id || "GLOBAL";
      activeFY = await prisma.financialYear.findFirst({ where: { schoolId, isCurrent: true } });
      if (!activeFY) {
        step(`❌ No active FY for school: ${schoolId}`);
        return NextResponse.json({ success: false, log, error: "No active FY" }, { status: 422 });
      }
      step(`✅ FY: ${activeFY.name}`);
      // Use the real student id for the record
      (notes as any).resolvedStudentId = resolvedStudent.id;
    }

    // ── 5. Record in DB ──
    const totalPaid = payment.amount / 100;
    const termsRaw  = notes.terms || notes.selectedTerms || "";
    const terms     = termsRaw.split(",").filter(Boolean);
    // Resolve the final studentId (real or test-resolved)
    const finalStudentId = (studentId && studentId !== "TEST_STUDENT")
      ? studentId
      : (notes as any).resolvedStudentId;

    let receiptNumber = "";

    await prisma.$transaction(async (tx: any) => {
      const { CounterService } = await import("@/lib/services/counter-service");
      receiptNumber = await CounterService.generateReceiptNumber({
        schoolId, schoolCode: schoolId,
        branchId, branchCode: branchId.split("-").pop() || "MAIN",
        year: new Date().getFullYear().toString(),
      }, tx);
      step(`Receipt # generated: ${receiptNumber}`);

      const collection = await tx.collection.create({
        data: {
          receiptNumber,
          studentId: finalStudentId,
          schoolId, branchId,
          financialYearId: activeFY!.id,
          amountPaid: totalPaid,
          lateFeePaid: 0,
          convenienceFee: 0,
          totalPaid,
          paymentMode: "Razorpay",
          paymentReference: razorpay_payment_id,
          collectedBy: "TEST_PAY_LAB",
          status: "Success",
          allocatedTo: {
            terms: terms.length > 0 ? terms : ["test"],
            bankRrn: payment.acquirer_data?.rrn || payment.acquirer_data?.upi_transaction_id,
            customerContact: payment.contact,
            customerEmail: payment.email,
            paymentMethod: payment.method,
            waiverReason: "[TEST_PAY_LAB]",
          },
        },
      });
      step(`✅ Collection created: id=${collection.id}`);

      await tx.activityLog.create({
        data: {
          schoolId, userId: "TEST_PAY_LAB",
          entityType: "COLLECTION", entityId: collection.id,
          action: "TEST_SETTLED",
          details: `Test lab settled ${razorpay_payment_id} → Receipt ${receiptNumber} (₹${totalPaid})`,
        },
      });
    });

    step(`🏁 DONE — Payment recorded! Receipt: ${receiptNumber}, Amount: ₹${totalPaid}`);

    return NextResponse.json({
      success: true,
      log,
      receipt: receiptNumber,
      amount: totalPaid,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      studentName,
      paymentMethod: payment.method,
      bankRrn: payment.acquirer_data?.rrn,
    });

  } catch (err: any) {
    step(`💥 FATAL ERROR: ${err.message}`);
    console.error("[TEST_PAY_VERIFY] Fatal:", err);
    return NextResponse.json({ success: false, log, error: err.message }, { status: 500 });
  }
}
