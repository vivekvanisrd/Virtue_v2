"use server";

/**
 * Manual, human-reviewed sync from the school's live Google Sheet (the
 * STUDENT_MASTER and FEE_COLLECTION tabs only — no other tab is ever read)
 * into the ERP. Deliberately NOT automatic: a real case surfaced while
 * building this (a sheet row "G.RITHVIKA" / "VRO820" that was actually an
 * existing student "G.RITHWIKA" / "VR0820" written with a typo and a letter
 * "O" instead of a digit "0") showed that blind matching on this sheet's data
 * can silently create duplicate students or misattribute payments. So this
 * always surfaces its matching evidence (exact / formatting-tolerant /
 * phone-number match) and lets a human tick exactly which rows to import —
 * nothing is written until `syncSelectedSheetRows` is called with an explicit
 * selection.
 */

import * as XLSX from "xlsx";
import prisma from "../../prisma";
import { revalidatePath } from "next/cache";
import { requireIdentity, normalizeIndianPhone } from "./shared";

const MANAGER_ROLES = new Set(["OWNER", "DEVELOPER", "PLATFORM_ADMIN"]);

const SHEET_ID = "1Fr9U5jIlxLrTlNlgRxScsCqH9UwrRLipWRRRFs0K5nc";
const SHEET_EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

const BRANCH_CODE_TO_ID: Record<string, string> = {
  RCB: "VIVES-RCB",
  SNB: "VIVES-SNB",
  MNB: "VIVES-MNB",
};

// ---- Admission-number normalization (same rules the original RCB source-of-
// truth reconciliation used) — a leading zero, a "-26" year suffix, and the
// letter "O" typed for the digit "0" are all known formatting variants of the
// exact same admission number in this school's data. ----
const KNOWN_ADM_PREFIXES = ["TEMP", "PENDING", "VR", "VS", "VM"];
function cleanAdmNo(raw: string): string {
  const s = (raw || "").trim().toUpperCase();
  if (!s) return "";
  const prefix = KNOWN_ADM_PREFIXES.find((p) => s.startsWith(p));
  if (!prefix) return s;
  return prefix + s.slice(prefix.length).replace(/O/g, "0");
}
function admNoCanonicalKey(cleaned: string): string {
  const m = cleaned.match(/^([A-Z]+)(\d+)(-\d+)?$/);
  if (!m) return cleaned;
  const [, prefix, digits] = m;
  return prefix + (digits.replace(/^0+/, "") || "0");
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}
function namesLookSimilar(a: string, b: string): boolean {
  const na = a.trim().toUpperCase().replace(/[^A-Z]/g, "");
  const nb = b.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (!na || !nb) return false;
  if (na === nb) return true;
  return levenshtein(na, nb) <= Math.max(1, Math.floor(Math.min(na.length, nb.length) * 0.15));
}

const CLASS_NAME_MAP: Record<string, string> = {
  NUR: "Nursery",
  NURSERY: "Nursery",
  LKG: "LKG",
  UKG: "UKG",
  "PP-II(A)": "UKG",
  "PP-II(B)": "UKG",
  PPII: "UKG",
  PP2: "UKG",
  "PP-I": "Play Group",
  PPI: "Play Group",
  PP1: "Play Group",
  PLAY: "Play Group",
  PG: "Play Group",
  DC: "Day Care",
  DAYCARE: "Day Care",
  "DAY CARE": "Day Care",
};
const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
function normalizeClassName(raw: string): string | null {
  const s = (raw || "").trim().toUpperCase();
  if (!s) return null;
  if (CLASS_NAME_MAP[s]) return CLASS_NAME_MAP[s];
  const m = s.match(/^(\d{1,2})/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 12) return `${ORDINAL[n]} Grade`;
  }
  return null;
}

const RECOGNIZED_FEE_HEADS = new Set(["Term 1", "Term 2", "Term 3", "Admission Fee", "Transport Fee", "General"]);
function resolveFeeHead(paymentFor: string): string {
  const trimmed = (paymentFor || "").trim();
  return RECOGNIZED_FEE_HEADS.has(trimmed) ? trimmed : "General";
}

async function fetchSheetWorkbook(): Promise<XLSX.WorkBook> {
  const res = await fetch(SHEET_EXPORT_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not reach the Google Sheet (HTTP ${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  return XLSX.read(buf, { type: "buffer" });
}

function loadRaw(wb: XLSX.WorkBook, tabName: string): any[][] {
  const sheetName = wb.SheetNames.find((n) => n.trim().toUpperCase() === tabName.toUpperCase());
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" }) as any[][];
}

type SheetStudentRow = {
  sheetId: string;
  cleanedAdmNo: string;
  name: string;
  parentName: string;
  phone: string | null;
  branchCode: string;
  className: string;
  admissionFee: number;
  concession: number;
  tuitionFee: number;
  transportFee: number;
};

// STUDENT_MASTER: header row 0, data from row 1.
// ID | Student Name | Parent Name | Contact | Branch | Class | Stop Name | Admission Fee | Concession | Tuition Fee | Transport Fee | ...
function parseStudentMaster(wb: XLSX.WorkBook): SheetStudentRow[] {
  const rows = loadRaw(wb, "STUDENT_MASTER");
  const out: SheetStudentRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const sheetId = String(r[0] || "").trim();
    if (!sheetId) continue;
    out.push({
      sheetId,
      cleanedAdmNo: cleanAdmNo(sheetId),
      name: String(r[1] || "").trim(),
      parentName: String(r[2] || "").trim(),
      phone: normalizeIndianPhone(String(r[3] || "")).value,
      branchCode: String(r[4] || "").trim().toUpperCase(),
      className: String(r[5] || "").trim(),
      admissionFee: Number(r[7]) || 0,
      concession: Number(r[8]) || 0,
      tuitionFee: Number(r[9]) || 0,
      transportFee: Number(r[10]) || 0,
    });
  }
  return out;
}

type SheetPaymentRow = {
  receipt: string;
  admNo: string;
  cleanedAdmNo: string;
  name: string;
  cash: number;
  online: number;
  amount: number;
  paymentFor: string;
  collectedBy: string;
  reference: string;
};

// FEE_COLLECTION: header row 1, data from row 2.
// SlNo | Date | Receipt No | Admi No | Student Name | Cash | Online | Total | Payment For | Fee Head | Collected By | Transaction Ref | ...
function parseFeeCollection(wb: XLSX.WorkBook): SheetPaymentRow[] {
  const rows = loadRaw(wb, "FEE_COLLECTION");
  const out: SheetPaymentRow[] = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const receipt = String(r[2] || "").trim();
    const name = String(r[4] || "").trim();
    if (!receipt && !name) continue;
    const admNo = String(r[3] || "").trim();
    out.push({
      receipt,
      admNo,
      cleanedAdmNo: cleanAdmNo(admNo),
      name,
      cash: Number(r[5]) || 0,
      online: Number(r[6]) || 0,
      amount: Number(r[7]) || 0,
      paymentFor: String(r[8] || "").trim(),
      collectedBy: String(r[10] || "").trim(),
      reference: String(r[11] || "").trim(),
    });
  }
  return out;
}

type DbStudentLite = { id: string; firstName: string; lastName: string | null; admissionNumber: string | null; branchId: string };

function displayName(s: { firstName: string; lastName: string | null }) {
  return [s.firstName, s.lastName].filter(Boolean).join(" ");
}

/**
 * Fetches the live sheet and compares it against the current roster/ledger.
 * Read-only — never writes. Owner/Developer/Platform Admin only, since this
 * spans every branch (matching how getBranchSummaryReport is gated).
 */
export async function checkSheetForUpdates() {
  try {
    const identity = await requireIdentity();
    if (!MANAGER_ROLES.has(identity.role)) {
      return { success: false as const, error: "Only Owner, Developer, or Platform Admin can check the sheet for updates." };
    }

    const wb = await fetchSheetWorkbook();
    const sheetStudents = parseStudentMaster(wb);
    const sheetPayments = parseFeeCollection(wb);

    const dbStudents = await prisma.student.findMany({
      where: { schoolId: identity.schoolId, isDeleted: false },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true, branchId: true },
    });
    const byExactAdmNo = new Map<string, DbStudentLite>();
    const byCanonicalAdmNo = new Map<string, DbStudentLite[]>();
    for (const s of dbStudents) {
      const cleaned = cleanAdmNo(s.admissionNumber || "");
      if (!cleaned) continue;
      byExactAdmNo.set(cleaned, s);
      const canon = admNoCanonicalKey(cleaned);
      if (!byCanonicalAdmNo.has(canon)) byCanonicalAdmNo.set(canon, []);
      byCanonicalAdmNo.get(canon)!.push(s);
    }

    const dbFamilies = await prisma.familyDetail.findMany({
      where: { schoolId: identity.schoolId },
      select: {
        fatherPhone: true,
        fatherAltPhone: true,
        motherPhone: true,
        motherAltPhone: true,
        emergencyPhone: true,
        whatsappNumber: true,
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true, isDeleted: true } },
      },
    });
    const byPhone = new Map<string, DbStudentLite>();
    for (const f of dbFamilies) {
      if (!f.student || f.student.isDeleted) continue;
      for (const raw of [f.fatherPhone, f.fatherAltPhone, f.motherPhone, f.motherAltPhone, f.emergencyPhone, f.whatsappNumber]) {
        const norm = normalizeIndianPhone(raw || "").value;
        if (norm) byPhone.set(norm, f.student as DbStudentLite);
      }
    }

    const existingReceipts = await prisma.collection.findMany({
      where: { schoolId: identity.schoolId, bookReceiptNo: { not: null } },
      select: { bookReceiptNo: true },
    });
    const importedReceiptSet = new Set(existingReceipts.map((c) => c.bookReceiptNo).filter(Boolean) as string[]);

    // The ORIGINAL one-time bulk import (before this Sheet Sync tool existed)
    // wrote 342 of the school's 615 real collections with no bookReceiptNo at
    // all — tagged `allocatedTo.auditMeta.source === "legacy-import"` instead,
    // carrying a synthetic receiptNumber like "LEGACY-VR1254-Term1-C". Receipt-
    // number matching alone is blind to every one of those, which would make
    // "New only" show over half the sheet's real history as still-pending.
    // Close that gap with a second, amount-based check: same student + same
    // amount + same fee head as an existing collection is treated as already
    // covered, even with no receipt number on file.
    const allCollections = await prisma.collection.findMany({
      where: { schoolId: identity.schoolId, status: "Success", isDeleted: false },
      select: { studentId: true, amountPaid: true, allocatedTo: true },
    });
    const importedByAmountKey = new Set<string>();
    for (const c of allCollections) {
      const feeHead = (c.allocatedTo as any)?.feeHead || "";
      importedByAmountKey.add(`${c.studentId}|${Number(c.amountPaid)}|${feeHead}`);
    }

    // Every sheet row is returned — new AND already-imported — so the review
    // screen can filter between them instead of only ever seeing "new" rows.
    const students = [];
    for (const row of sheetStudents) {
      const exact = byExactAdmNo.get(row.cleanedAdmNo);
      if (exact) {
        students.push({
          sheetId: row.sheetId,
          name: row.name,
          parentName: row.parentName,
          phone: row.phone,
          branchCode: row.branchCode,
          className: row.className,
          status: "imported" as const,
          matchedStudent: { id: exact.id, name: displayName(exact), admissionNumber: exact.admissionNumber },
          canonicalMatch: null,
          phoneMatch: null,
          looksLikeDuplicate: false,
          resolvedBranchId: null,
          resolvedClassName: null,
          tuitionFee: row.tuitionFee,
          admissionFee: row.admissionFee,
          concession: row.concession,
          transportFee: row.transportFee,
        });
        continue;
      }

      const canonicalCandidates = byCanonicalAdmNo.get(admNoCanonicalKey(row.cleanedAdmNo)) || [];
      const canonicalMatch = canonicalCandidates.find((c) => namesLookSimilar(displayName(c), row.name)) || null;
      const phoneMatch = row.phone ? byPhone.get(row.phone) || null : null;

      students.push({
        sheetId: row.sheetId,
        name: row.name,
        parentName: row.parentName,
        phone: row.phone,
        branchCode: row.branchCode,
        resolvedBranchId: BRANCH_CODE_TO_ID[row.branchCode] || null,
        className: row.className,
        resolvedClassName: normalizeClassName(row.className),
        tuitionFee: row.tuitionFee,
        admissionFee: row.admissionFee,
        concession: row.concession,
        transportFee: row.transportFee,
        status: "new" as const,
        matchedStudent: null,
        canonicalMatch: canonicalMatch
          ? { id: canonicalMatch.id, name: displayName(canonicalMatch), admissionNumber: canonicalMatch.admissionNumber }
          : null,
        phoneMatch: phoneMatch ? { id: phoneMatch.id, name: displayName(phoneMatch), admissionNumber: phoneMatch.admissionNumber } : null,
        looksLikeDuplicate: !!(canonicalMatch || phoneMatch),
      });
    }

    const payments = [];
    for (const row of sheetPayments) {
      if (!row.receipt) continue; // no receipt number — can't safely dedupe against future checks, so left out of v1

      const exact = byExactAdmNo.get(row.cleanedAdmNo) || null;
      const canonicalCandidates = !exact ? byCanonicalAdmNo.get(admNoCanonicalKey(row.cleanedAdmNo)) || [] : [];
      const canonicalMatch = !exact ? canonicalCandidates.find((c) => namesLookSimilar(displayName(c), row.name)) || null : null;
      const matched = exact || canonicalMatch;
      const feeHead = resolveFeeHead(row.paymentFor);

      const matchedByReceipt = importedReceiptSet.has(row.receipt);
      const matchedByAmount = matched ? importedByAmountKey.has(`${matched.id}|${row.amount}|${feeHead}`) : false;

      if (matchedByReceipt || matchedByAmount) {
        payments.push({
          receipt: row.receipt,
          admNo: row.admNo,
          name: row.name,
          amount: row.amount,
          mode: row.cash > 0 ? "Cash" : "Online",
          reference: row.reference || null,
          feeHead,
          rawPaymentFor: row.paymentFor,
          collectedBy: row.collectedBy || null,
          status: "imported" as const,
          matchedStudent: matched ? { id: matched.id, name: displayName(matched), admissionNumber: matched.admissionNumber } : null,
          matchIsExact: !!exact,
          matchMethod: matchedByReceipt ? ("receipt" as const) : ("amount" as const),
        });
        continue;
      }

      payments.push({
        receipt: row.receipt,
        admNo: row.admNo,
        name: row.name,
        amount: row.amount,
        mode: row.cash > 0 ? "Cash" : "Online",
        reference: row.reference || null,
        feeHead,
        rawPaymentFor: row.paymentFor,
        collectedBy: row.collectedBy || null,
        status: "new" as const,
        matchedStudent: matched ? { id: matched.id, name: displayName(matched), admissionNumber: matched.admissionNumber } : null,
        matchIsExact: !!exact,
        matchMethod: null,
      });
    }

    const newStudentsCount = students.filter((s) => s.status === "new").length;
    const newPaymentsCount = payments.filter((p) => p.status === "new").length;

    await prisma.globalSetting.upsert({
      where: { schoolId_key: { schoolId: identity.schoolId, key: "simple_sheet_sync_last_check" } },
      update: {
        value: JSON.stringify({ checkedAt: new Date().toISOString(), newStudents: newStudentsCount, newPayments: newPaymentsCount }),
      },
      create: {
        schoolId: identity.schoolId,
        key: "simple_sheet_sync_last_check",
        value: JSON.stringify({ checkedAt: new Date().toISOString(), newStudents: newStudentsCount, newPayments: newPaymentsCount }),
      },
    });

    return {
      success: true as const,
      data: { checkedAt: new Date().toISOString(), students, payments },
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not check the sheet for updates." };
  }
}

/** Last-known check summary, for the dashboard widget — does not re-fetch the sheet. */
export async function getLastSheetCheckSummary() {
  try {
    const identity = await requireIdentity();
    const setting = await prisma.globalSetting.findUnique({
      where: { schoolId_key: { schoolId: identity.schoolId, key: "simple_sheet_sync_last_check" } },
      select: { value: true },
    });
    if (!setting) return { success: true as const, data: null };
    return { success: true as const, data: JSON.parse(setting.value) };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load sync status." };
  }
}

/**
 * Writes exactly the rows the human ticked — re-fetches and re-resolves the
 * sheet fresh rather than trusting the client's cached review screen, so a
 * stale page (or someone else finishing a sync in the meantime) can't
 * double-import a row.
 */
export async function syncSelectedSheetRows(input: { newStudentSheetIds: string[]; newPaymentReceipts: string[] }) {
  try {
    const identity = await requireIdentity();
    if (!MANAGER_ROLES.has(identity.role)) {
      return { success: false as const, error: "Only Owner, Developer, or Platform Admin can sync sheet data." };
    }

    const wb = await fetchSheetWorkbook();
    const sheetStudents = parseStudentMaster(wb);
    const sheetPayments = parseFeeCollection(wb);

    const results: { label: string; success: boolean; message: string }[] = [];
    const newlyCreatedStudentIds = new Map<string, string>();

    for (const sheetId of input.newStudentSheetIds || []) {
      const row = sheetStudents.find((r) => r.sheetId === sheetId);
      if (!row) {
        results.push({ label: sheetId, success: false, message: "Row no longer found in the sheet." });
        continue;
      }

      const already = await prisma.student.findFirst({
        where: { schoolId: identity.schoolId, admissionNumber: row.cleanedAdmNo, isDeleted: false },
        select: { id: true },
      });
      if (already) {
        results.push({ label: `${row.name} (${sheetId})`, success: false, message: "Already exists in the ERP — skipped to avoid a duplicate." });
        continue;
      }

      const branchId = BRANCH_CODE_TO_ID[row.branchCode];
      if (!branchId) {
        results.push({ label: `${row.name} (${sheetId})`, success: false, message: `Unrecognized branch "${row.branchCode}" — not imported.` });
        continue;
      }

      const className = normalizeClassName(row.className);
      let classId: string | null = null;
      if (className) {
        const cls = await prisma.class.findFirst({ where: { branchId, name: className }, select: { id: true } });
        classId = cls?.id || null;
      }

      let tuitionFee = row.tuitionFee;
      let tuitionNote = "";
      if (!tuitionFee && classId) {
        const sample = await prisma.financialRecord.findMany({
          where: { branchId, student: { academic: { classId }, isDeleted: false } },
          select: { tuitionFee: true },
          take: 50,
        });
        const freq = new Map<number, number>();
        for (const s of sample) {
          const v = Number(s.tuitionFee) || 0;
          if (v > 0) freq.set(v, (freq.get(v) || 0) + 1);
        }
        let best = 0;
        let bestCount = 0;
        for (const [v, c] of freq) {
          if (c > bestCount) {
            best = v;
            bestCount = c;
          }
        }
        tuitionFee = best;
        tuitionNote = best ? ` (tuition fee not in sheet — used this class's standard ₹${best})` : " (tuition fee not set — please set it manually)";
      }

      const concession = row.concession || 0;
      const netTuition = Math.max(tuitionFee - concession, 0);
      const phone = normalizeIndianPhone(row.phone || "").value;

      const student = await prisma.student.create({
        data: {
          firstName: row.name,
          lastName: null,
          admissionNumber: row.cleanedAdmNo,
          studentCode: row.cleanedAdmNo,
          schoolId: identity.schoolId,
          branchId,
          status: "ACTIVE",
          ...(classId
            ? {
                academic: {
                  create: {
                    admissionDate: new Date(),
                    academicYear: new Date().getFullYear().toString(),
                    classId,
                    schoolId: identity.schoolId,
                    branchId,
                  },
                },
              }
            : {}),
          ...(row.parentName || phone
            ? {
                family: {
                  create: {
                    fatherName: row.parentName || null,
                    fatherPhone: phone,
                    schoolId: identity.schoolId,
                    branchId,
                  },
                },
              }
            : {}),
          financial: {
            create: {
              annualTuition: tuitionFee,
              tuitionFee,
              totalDiscount: concession,
              netTuition,
              admissionFee: row.admissionFee || 0,
              transportFee: row.transportFee || 0,
              term1Amount: Math.round(tuitionFee * 0.5),
              term2Amount: Math.round(tuitionFee * 0.25),
              term3Amount: Math.round(tuitionFee * 0.25),
              paymentType: "Term-wise",
              schoolId: identity.schoolId,
              branchId,
            },
          },
        } as any,
        select: { id: true },
      });

      newlyCreatedStudentIds.set(row.cleanedAdmNo, student.id);
      const classNote = classId ? "" : ` (class "${row.className}" not auto-resolved — please set it manually)`;
      results.push({ label: `${row.name} (${sheetId})`, success: true, message: `Created${classNote}${tuitionNote}.` });
    }

    const { recordPayment } = await import("./fee-actions");
    for (const receipt of input.newPaymentReceipts || []) {
      const row = sheetPayments.find((r) => r.receipt === receipt);
      if (!row) {
        results.push({ label: `Receipt ${receipt}`, success: false, message: "Row no longer found in the sheet." });
        continue;
      }

      const alreadyByReceipt = await prisma.collection.findFirst({
        where: { schoolId: identity.schoolId, bookReceiptNo: receipt },
        select: { id: true },
      });
      if (alreadyByReceipt) {
        results.push({ label: `${row.name} — receipt ${receipt}`, success: false, message: "Already recorded — skipped to avoid double-counting." });
        continue;
      }

      let studentId = newlyCreatedStudentIds.get(row.cleanedAdmNo) || null;
      if (!studentId) {
        const exact = await prisma.student.findFirst({
          where: { schoolId: identity.schoolId, admissionNumber: row.cleanedAdmNo, isDeleted: false },
          select: { id: true },
        });
        studentId = exact?.id || null;
      }
      if (!studentId) {
        results.push({ label: `${row.name} — receipt ${receipt}`, success: false, message: "Could not resolve to a student — not imported." });
        continue;
      }

      // Second, receipt-independent safety net: the original one-time bulk
      // import wrote many real collections with no bookReceiptNo at all (see
      // checkSheetForUpdates), so the check above alone can't see them. Catch
      // those here too, right before writing, in case the review screen was
      // stale (opened before someone else synced, or before that legacy row
      // was known).
      const feeHead = resolveFeeHead(row.paymentFor);
      const alreadyByAmount = await prisma.collection.findFirst({
        where: { schoolId: identity.schoolId, studentId, status: "Success", isDeleted: false, amountPaid: row.amount },
        select: { id: true, allocatedTo: true },
      });
      if (alreadyByAmount && (alreadyByAmount.allocatedTo as any)?.feeHead === feeHead) {
        results.push({
          label: `${row.name} — receipt ${receipt}`,
          success: false,
          message: "Already recorded (matched by amount — this student already has a same-amount, same-term payment on file) — skipped to avoid double-counting.",
        });
        continue;
      }

      const result = await recordPayment({
        studentId,
        amount: row.amount,
        mode: row.cash > 0 ? "Cash" : "Online",
        reference: row.reference || undefined,
        feeHead,
        manualReceiptNumber: row.receipt,
        collectedByOverride: row.collectedBy || undefined,
      });
      results.push({
        label: `${row.name} — receipt ${receipt} (₹${row.amount})`,
        success: result.success,
        message: result.success ? `Recorded (system receipt ${result.receiptNumber}).` : result.error ?? "Failed.",
      });
    }

    revalidatePath("/simple");
    revalidatePath("/simple/students");
    return { success: true as const, results };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Sync failed." };
  }
}
