"use client";

import Link from "next/link";
import { SortTh } from "@/components/simple/SortTh";
import { ExcelViewToggle } from "@/components/simple/ExcelViewToggle";
import { ExcelView, type ExcelColumn } from "@/components/simple/ExcelView";
import { bulkUpdateCollectionFields } from "@/lib/actions/simple/report-actions";
import { StudentHoverCard } from "@/components/simple/StudentHoverCard";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const EXCEL_COLUMNS: ExcelColumn[] = [
  { key: "dateLabel", title: "Date", readOnly: true, width: 100 },
  { key: "receiptNumber", title: "Receipt #", readOnly: true, width: 160 },
  { key: "bookReceiptNo", title: "Manual receipt #", width: 130 },
  { key: "studentName", title: "Student", readOnly: true, width: 160 },
  { key: "feeHead", title: "Fee head", readOnly: true, width: 110 },
  { key: "paymentMode", title: "Mode", readOnly: true, width: 90 },
  { key: "collectedBy", title: "Collected by", width: 140 },
  { key: "amountPaid", title: "Amount", readOnly: true, type: "numeric", width: 100 },
];

export function CollectionReportTable({
  rows,
  sortBy,
  basePath,
  searchParams,
}: {
  rows: any[];
  sortBy: string;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const table = (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f9fafb", textAlign: "left" }}>
            <th style={thStyle}>#</th>
            <SortTh label="Date" ascValue="dateAsc" descValue="dateDesc" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
            <th style={thStyle}>Receipt #</th>
            <th style={thStyle}>Manual receipt #</th>
            <SortTh label="Student" ascValue="nameAsc" descValue="nameDesc" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
            <th style={thStyle}>Fee head</th>
            <th style={thStyle}>Mode</th>
            <th style={thStyle}>Collected by</th>
            <SortTh label="Amount" ascValue="amountAsc" descValue="amountDesc" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={{ borderTop: "1px solid #f3f4f6" }}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={tdStyle}>{new Date(r.paymentDate).toLocaleDateString("en-IN")}</td>
              <td style={tdStyle}>{r.receiptNumber}</td>
              <td style={tdStyle}>{r.bookReceiptNo || "—"}</td>
              <td style={tdStyle}>
                <StudentHoverCard studentId={r.studentId}>
                  <Link href={`/simple/students/${r.studentId}`} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                    {r.studentName}
                  </Link>
                </StudentHoverCard>{" "}
                {r.admissionNumber && <span style={{ color: "#9ca3af" }}>#{r.admissionNumber}</span>}
              </td>
              <td style={tdStyle}>{r.feeHead || "—"}</td>
              <td style={tdStyle}>{r.paymentMode}</td>
              <td style={tdStyle}>{r.collectedBy}</td>
              <td style={tdStyle}>
                <strong>{money(r.amountPaid)}</strong>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={9}>
                <span style={{ color: "#6b7280" }}>No payments match these filters.</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const excelRows = rows.map((r) => ({ ...r, dateLabel: new Date(r.paymentDate).toLocaleDateString("en-IN") }));
  const excel = (
    <ExcelView
      columns={EXCEL_COLUMNS}
      rows={excelRows}
      idKey="id"
      onSave={(changed) => bulkUpdateCollectionFields(changed as any)}
    />
  );

  return <ExcelViewToggle table={table} excel={excel} />;
}

const thStyle: React.CSSProperties = { padding: "10px 14px", fontSize: 12, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "10px 14px", color: "#111827" };
