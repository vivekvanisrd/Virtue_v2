/**
 * bank-parser.ts
 * 
 * SOVEREIGN BANK STATEMENT PARSER
 * Handles real statement formats from:
 *   - Axis Bank (XLSX) — header row 20, data from row 22
 *   - HDFC Bank (XLS)  — header row 21, data from row 23, 2-digit year dates
 *   - Bank of Baroda   (PDF text) — tabular text extraction
 * 
 * Architecture: Pure parsing layer — no DB, no auth. Returns structured ParsedEntry[].
 */

export interface ParsedEntry {
  txnDate: Date;
  valueDate?: Date;
  description: string;
  reference?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  txnType: "CREDIT" | "DEBIT" | "UNKNOWN";
  rawRow?: number; // source row number for debugging
}

export interface ParsedStatement {
  bankName: "AXIS" | "HDFC" | "BOB" | "UNKNOWN";
  accountNo?: string;
  periodFrom?: Date;
  periodTo?: Date;
  openingBal?: number;
  closingBal?: number;
  totalCredits?: number;
  totalDebits?: number;
  entries: ParsedEntry[];
  errors: string[];
}

// ─── Utility: Parse Indian-format amounts ──────────────────────────────────
// Handles "1,09,663.00", "20000", "3,12,007.87", "1307717.67 Cr"
function parseAmount(raw: string | number | undefined | null): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const str = String(raw).trim().replace(/,/g, "").replace(/\s*(Cr|Dr)\s*/i, "").trim();
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

// ─── Utility: Parse Indian DD/MM/YYYY or DD/MM/YY date ────────────────────
function parseDate(raw: string | number | undefined | null): Date | undefined {
  if (!raw) return undefined;
  const str = String(raw).trim();
  if (!str || str === "" || str.toLowerCase() === "date") return undefined;

  // Handle Excel serial date numbers
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str);
    // Excel date serial to JS Date (Excel epoch is Dec 30, 1899)
    const msPerDay = 86400000;
    return new Date((serial - 25569) * msPerDay);
  }

  // DD/MM/YYYY
  const fullMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fullMatch) {
    const [, d, m, y] = fullMatch;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }

  // DD/MM/YY (HDFC uses 2-digit year)
  const shortMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (shortMatch) {
    const [, d, m, y] = shortMatch;
    const year = parseInt(y) + 2000; // Assumes 21st century
    return new Date(year, parseInt(m) - 1, parseInt(d));
  }

  // DD-MM-YYYY (BOB format)
  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, d, m, y] = dashMatch;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }

  // DD-MMM-YYYY (e.g. 01-Mar-2026)
  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const namedMonth = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (namedMonth) {
    const [, d, m, y] = namedMonth;
    const month = monthNames[m.toLowerCase()];
    if (month !== undefined) return new Date(parseInt(y), month, parseInt(d));
  }

  return undefined;
}

// ─── Utility: Extract account number from statement header text ───────────
function extractAccountNo(rows: string[][]): string | undefined {
  for (const row of rows.slice(0, 25)) {
    const fullText = row.join(" ");
    // Axis: "Statement of Account No - 915010023357136 for..."
    const axisMatch = fullText.match(/Account No[.\s-]+(\d{10,20})/i);
    if (axisMatch) return axisMatch[1];
    // HDFC: "Account No :50200083539863"
    const hdfcMatch = fullText.match(/Account No\s*:\s*(\d{10,20})/i);
    if (hdfcMatch) return hdfcMatch[1];
    // BOB: "Account Number : XXXXXXX"
    const bobMatch = fullText.match(/Account Number\s*[:\s]+(\d{10,20})/i);
    if (bobMatch) return bobMatch[1];
  }
  return undefined;
}

// ─── Axis Bank Parser ───────────────────────────────────────────────────────
// Header is Row 20 (index 19): S.NO | Txn Date | Value Date | Particulars | Debit | Credit | Balance | ChequeNo | Branch
// Data starts at Row 22 (index 21), row 21 is "OPENING BALANCE"
export function parseAxisStatement(rawRows: any[][]): ParsedStatement {
  const result: ParsedStatement = {
    bankName: "AXIS",
    entries: [],
    errors: []
  };

  result.accountNo = extractAccountNo(rawRows.map(r => r.map(String)));

  // Extract period from row 18 (index 17): "Statement of Account No - ... for the period (From : 01/03/2026 To : 10/05/2026)"
  const headerText = rawRows.slice(0, 25).map(r => r.join(" ")).join(" ");
  const periodMatch = headerText.match(/From\s*:\s*(\d{2}\/\d{2}\/\d{4})\s+To\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (periodMatch) {
    result.periodFrom = parseDate(periodMatch[1]);
    result.periodTo = parseDate(periodMatch[2]);
  }

  // Find header row: look for row containing "Particulars" or "Transaction Date"
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 30); i++) {
    const row = rawRows[i].map(c => String(c || "").toLowerCase());
    if (row.some(c => c.includes("particulars") || c.includes("transaction date"))) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) {
    result.errors.push("Could not detect header row in Axis statement");
    return result;
  }

  // Column indices from header
  const headers = rawRows[headerRowIdx].map(c => String(c || "").toLowerCase().trim());
  const colDate = headers.findIndex(h => h.includes("transaction date"));
  const colValueDate = headers.findIndex(h => h.includes("value date"));
  const colDesc = headers.findIndex(h => h.includes("particulars"));
  const colDebit = headers.findIndex(h => h.includes("debit"));
  const colCredit = headers.findIndex(h => h.includes("credit"));
  const colBalance = headers.findIndex(h => h.includes("balance"));
  const colCheque = headers.findIndex(h => h.includes("cheque"));

  let totalCredits = 0;
  let totalDebits = 0;
  let closingBal: number | undefined;

  // Process data rows
  for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const desc = String(row[colDesc] || "").trim();

    // Stop at disclaimers/legend section
    if (desc.toLowerCase().includes("unless the constituent") ||
        desc.toLowerCase().includes("registered office") ||
        desc.toLowerCase().includes("legend :") ||
        (desc === "" && row.every(c => String(c || "").trim() === ""))) {
      continue;
    }

    // Capture closing balance row
    if (desc === "CLOSING BALANCE") {
      closingBal = parseAmount(row[colBalance]);
      continue;
    }

    // Capture total row
    if (desc === "TRANSACTION TOTAL DR/CR") {
      totalDebits = parseAmount(row[colDebit]) || 0;
      totalCredits = parseAmount(row[colCredit]) || 0;
      continue;
    }

    // Skip OPENING BALANCE row
    if (desc === "OPENING BALANCE") {
      result.openingBal = parseAmount(row[colBalance]);
      continue;
    }

    const txnDate = parseDate(row[colDate]);
    if (!txnDate) continue; // Skip non-transaction rows

    const debit = parseAmount(row[colDebit]);
    const credit = parseAmount(row[colCredit]);
    const balance = parseAmount(row[colBalance]);
    const reference = colCheque >= 0 ? String(row[colCheque] || "").trim() || undefined : undefined;

    result.entries.push({
      txnDate,
      valueDate: parseDate(row[colValueDate]),
      description: desc,
      reference,
      debit: debit && debit > 0 ? debit : undefined,
      credit: credit && credit > 0 ? credit : undefined,
      balance,
      txnType: credit && credit > 0 ? "CREDIT" : debit && debit > 0 ? "DEBIT" : "UNKNOWN",
      rawRow: i + 1
    });
  }

  result.totalCredits = totalCredits || result.entries.reduce((s, e) => s + (e.credit || 0), 0);
  result.totalDebits = totalDebits || result.entries.reduce((s, e) => s + (e.debit || 0), 0);
  result.closingBal = closingBal;

  return result;
}

// ─── HDFC Bank Parser ───────────────────────────────────────────────────────
// Header is Row 21 (index 20): Date | Narration | Chq./Ref.No. | Value Dt | Withdrawal Amt. | Deposit Amt. | Closing Balance
// Data starts Row 23 (index 22). Footer detection: "Generated On:" or "End Of Statement"
export function parseHDFCStatement(rawRows: any[][]): ParsedStatement {
  const result: ParsedStatement = {
    bankName: "HDFC",
    entries: [],
    errors: []
  };

  result.accountNo = extractAccountNo(rawRows.map(r => r.map(String)));

  // Extract period: "Statement From  :  01/02/2026         To  :  30/04/2026"
  const headerText = rawRows.slice(0, 25).map(r => r.join(" ")).join(" ");
  const periodMatch = headerText.match(/Statement From\s*:\s*(\d{2}\/\d{2}\/\d{4})\s+To\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (periodMatch) {
    result.periodFrom = parseDate(periodMatch[1]);
    result.periodTo = parseDate(periodMatch[2]);
  }

  // Find header row: look for "Narration" and "Withdrawal"
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 30); i++) {
    const row = rawRows[i].map(c => String(c || "").toLowerCase());
    if (row.some(c => c.includes("narration")) && row.some(c => c.includes("withdrawal"))) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) {
    result.errors.push("Could not detect header row in HDFC statement");
    return result;
  }

  const headers = rawRows[headerRowIdx].map(c => String(c || "").toLowerCase().trim());
  const colDate = headers.findIndex(h => h.includes("date") && !h.includes("value"));
  const colValueDate = headers.findIndex(h => h.includes("value") && h.includes("dt"));
  const colDesc = headers.findIndex(h => h.includes("narration"));
  const colRef = headers.findIndex(h => h.includes("chq") || h.includes("ref"));
  const colDebit = headers.findIndex(h => h.includes("withdrawal") || h.includes("debit"));
  const colCredit = headers.findIndex(h => h.includes("deposit") || h.includes("credit"));
  const colBalance = headers.findIndex(h => h.includes("closing") || h.includes("balance"));

  // Skip the separator row of asterisks (right after header)
  const dataStart = headerRowIdx + 2; // Skip the ******* separator row

  for (let i = dataStart; i < rawRows.length; i++) {
    const row = rawRows[i];
    const firstCell = String(row[0] || "").trim();

    // Stop at footer
    if (firstCell.toLowerCase().includes("generated on") ||
        firstCell.toLowerCase().includes("end of statement") ||
        firstCell.toLowerCase().includes("registered office") ||
        firstCell.toLowerCase().includes("state account branch")) {
      break;
    }

    // Skip empty rows
    if (firstCell === "" || firstCell === "---") continue;

    const txnDate = parseDate(firstCell);
    if (!txnDate) continue;

    const desc = String(row[colDesc] || "").trim();
    const reference = colRef >= 0 ? String(row[colRef] || "").trim() || undefined : undefined;
    const debit = parseAmount(row[colDebit]);
    const credit = parseAmount(row[colCredit]);
    const balance = parseAmount(row[colBalance]);

    result.entries.push({
      txnDate,
      valueDate: colValueDate >= 0 ? parseDate(row[colValueDate]) : undefined,
      description: desc,
      reference,
      debit: debit && debit > 0 ? debit : undefined,
      credit: credit && credit > 0 ? credit : undefined,
      balance,
      txnType: credit && credit > 0 ? "CREDIT" : debit && debit > 0 ? "DEBIT" : "UNKNOWN",
      rawRow: i + 1
    });
  }

  result.totalCredits = result.entries.reduce((s, e) => s + (e.credit || 0), 0);
  result.totalDebits = result.entries.reduce((s, e) => s + (e.debit || 0), 0);
  // Closing balance = last entry's balance
  const lastEntry = result.entries[result.entries.length - 1];
  if (lastEntry) result.closingBal = lastEntry.balance;

  return result;
}

// ─── BOB Bank PDF Parser ────────────────────────────────────────────────────
// Parses raw PDF text output (from pdf-parse or similar).
// BOB format: Date | Description | Reference | Debit | Credit | Balance
// Balance column often has "Cr" or "Dr" suffix
export function parseBOBStatement(pdfText: string): ParsedStatement {
  const result: ParsedStatement = {
    bankName: "BOB",
    entries: [],
    errors: []
  };

  const lines = pdfText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  // Extract account number
  for (const line of lines.slice(0, 30)) {
    const m = line.match(/Account\s+(?:Number|No)[.\s:]+(\d{10,20})/i);
    if (m) { result.accountNo = m[1]; break; }
  }

  // Extract period
  const fullText = lines.slice(0, 40).join(" ");
  const periodMatch = fullText.match(/From\s*[:\-]?\s*(\d{2}[\/-]\d{2}[\/-]\d{4})\s+To\s*[:\-]?\s*(\d{2}[\/-]\d{2}[\/-]\d{4})/i);
  if (periodMatch) {
    result.periodFrom = parseDate(periodMatch[1]);
    result.periodTo = parseDate(periodMatch[2]);
  }

  // BOB PDF text is typically in a tabular format. We detect transaction lines
  // by the presence of a date at the start: dd-mm-yyyy or dd/mm/yyyy
  const txnDatePattern = /^(\d{2}[-\/]\d{2}[-\/]\d{4})/;

  // State machine to accumulate multi-line descriptions
  let pendingEntry: Partial<ParsedEntry> | null = null;

  const saveEntry = () => {
    if (pendingEntry && pendingEntry.txnDate) {
      result.entries.push({
        txnDate: pendingEntry.txnDate!,
        valueDate: pendingEntry.valueDate,
        description: (pendingEntry.description || "").trim(),
        reference: pendingEntry.reference,
        debit: pendingEntry.debit,
        credit: pendingEntry.credit,
        balance: pendingEntry.balance,
        txnType: pendingEntry.credit ? "CREDIT" : pendingEntry.debit ? "DEBIT" : "UNKNOWN"
      });
    }
  };

  for (const line of lines) {
    // Skip header/footer lines
    if (line.toLowerCase().includes("opening balance") && !txnDatePattern.test(line)) {
      // Extract opening balance
      const m = line.match(/(\d[\d,]+\.\d{2})\s*(Cr|Dr)?/i);
      if (m) result.openingBal = parseAmount(m[1]);
      continue;
    }
    if (line.toLowerCase().includes("closing balance") && !txnDatePattern.test(line)) {
      const m = line.match(/(\d[\d,]+\.\d{2})\s*(Cr|Dr)?/i);
      if (m) result.closingBal = parseAmount(m[1]);
      continue;
    }

    const dateMatch = line.match(txnDatePattern);
    if (dateMatch) {
      // Save previous entry if any
      saveEntry();
      pendingEntry = null;

      // Parse: date, then the rest of the line contains: desc ref debit credit balance
      // BOB lines: 01-04-2026 DESCRIPTION         REF12345     40000.00           1307717.67 Cr
      const afterDate = line.slice(dateMatch[0].length).trim();
      const txnDate = parseDate(dateMatch[1]);
      if (!txnDate) continue;

      // Extract amounts from end of line: numbers with optional Cr/Dr
      const amounts: number[] = [];
      const amountMatches = afterDate.match(/\d[\d,]*\.\d{2}\s*(?:Cr|Dr)?/gi) || [];
      for (const a of amountMatches) {
        const v = parseAmount(a);
        if (v !== undefined) amounts.push(v);
      }

      // Extract balance: last amount that has Cr/Dr suffix
      let balance: number | undefined;
      let credit: number | undefined;
      let debit: number | undefined;

      if (amountMatches.length > 0) {
        const lastAmtRaw = amountMatches[amountMatches.length - 1];
        balance = parseAmount(lastAmtRaw);

        // Determine Cr/Dr by checking the "Cr" indicator in the full line
        const isCr = /\bCr\b/i.test(line);
        const isDr = /\bDr\b/i.test(line);

        if (amounts.length >= 2) {
          // Second-last is the txn amount
          const txnAmt = amounts[amounts.length - 2];
          if (isCr) credit = txnAmt;
          else if (isDr) debit = txnAmt;
        }
      }

      // Description is everything between date and first amount
      const firstAmtIdx = afterDate.search(/\d[\d,]*\.\d{2}/);
      const descAndRef = firstAmtIdx > 0 ? afterDate.slice(0, firstAmtIdx).trim() : afterDate;
      // Reference is usually last word if it looks like a reference number
      const refMatch = descAndRef.match(/([A-Z0-9]{8,})\s*$/);
      const description = refMatch ? descAndRef.slice(0, descAndRef.lastIndexOf(refMatch[1])).trim() : descAndRef;
      const reference = refMatch ? refMatch[1] : undefined;

      pendingEntry = { txnDate, description, reference, debit, credit, balance };
    } else if (pendingEntry) {
      // Continuation line — append to description
      if (line && !line.match(/^\d[\d,]+\.\d{2}/) && !line.toLowerCase().startsWith("page")) {
        pendingEntry.description = ((pendingEntry.description || "") + " " + line).trim();
      }
    }
  }
  saveEntry(); // Save last pending entry

  result.totalCredits = result.entries.reduce((s, e) => s + (e.credit || 0), 0);
  result.totalDebits = result.entries.reduce((s, e) => s + (e.debit || 0), 0);

  return result;
}

// ─── Auto-Detect Bank Format ─────────────────────────────────────────────────
export function detectBankFormat(rawRows: any[][]): "AXIS" | "HDFC" | "BOB" | "UNKNOWN" {
  const first30 = rawRows.slice(0, 30).map(r => r.map(c => String(c || "").toLowerCase()).join(" "));
  const fullText = first30.join(" ");

  if (fullText.includes("axis bank") || fullText.includes("utib0") || fullText.includes("particulars")) return "AXIS";
  if (fullText.includes("hdfc bank") || fullText.includes("hdfc0") || fullText.includes("narration") && fullText.includes("withdrawal")) return "HDFC";
  if (fullText.includes("bank of baroda") || fullText.includes("barb0") || fullText.includes("baroda")) return "BOB";

  return "UNKNOWN";
}

// ─── Main Entry: Parse XLSX/XLS rows ─────────────────────────────────────────
export function parseExcelStatement(rawRows: any[][]): ParsedStatement {
  const format = detectBankFormat(rawRows);
  if (format === "AXIS") return parseAxisStatement(rawRows);
  if (format === "HDFC") return parseHDFCStatement(rawRows);
  return { bankName: "UNKNOWN", entries: [], errors: [`Unknown bank format`] };
}

// ─── Auto-categorize a transaction entry ─────────────────────────────────────
// Classifies a transaction into one of our categories based on description patterns
export function categorizeTxn(desc: string, txnType: "CREDIT" | "DEBIT" | "UNKNOWN"): string {
  const d = desc.toLowerCase();

  // Fee collection patterns (credits)
  if (txnType === "CREDIT") {
    if (d.includes("paytm") || d.includes("razorpay") || d.includes("phonepe") || d.includes("gpay"))
      return "FEE_COLLECTION";
    if (d.includes("cash dep") || d.includes("cash deposit") || d.includes("dprh") || d.includes("bna"))
      return "FEE_COLLECTION";
    if (d.includes("upi") && !d.includes("google india digital")) return "FEE_COLLECTION";
  }

  // Salary patterns (debits)
  if (txnType === "DEBIT") {
    if (d.includes("salary") || d.includes("sal") || d.includes("neft") || d.includes("rtgs"))
      return "SALARY";
    if (d.includes("trf/") || d.includes("transfer")) return "SALARY";
  }

  // Expense patterns (debits)
  if (txnType === "DEBIT") {
    if (d.includes("fuel") || d.includes("expresway") || d.includes("express way")) return "EXPENSE";
    if (d.includes("google india digital") || d.includes("recharge")) return "EXPENSE";
    if (d.includes("rent")) return "EXPENSE";
  }

  // Internal transfers
  if (d.includes("self") || d.includes("own account") || d.includes("inter bank")
    || d.includes("barb0") || d.includes("hdfc0") || d.includes("utib0")) {
    return "INTERNAL_TRANSFER";
  }

  return "UNCLASSIFIED";
}
