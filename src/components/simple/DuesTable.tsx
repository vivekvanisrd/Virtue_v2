"use client";

import Link from "next/link";
import { SortTh } from "@/components/simple/SortTh";
import { ExcelViewToggle } from "@/components/simple/ExcelViewToggle";
import { ExcelView, type ExcelColumn } from "@/components/simple/ExcelView";
import { bulkUpdateStudentFields } from "@/lib/actions/simple/student-actions";
import { StudentHoverCard } from "@/components/simple/StudentHoverCard";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const EXCEL_COLUMNS: ExcelColumn[] = [
  { key: "admissionNumber", title: "Admission #", readOnly: true, width: 110 },
  { key: "name", title: "Student", readOnly: true, width: 160 },
  { key: "className", title: "Class", readOnly: true, width: 100 },
  { key: "parentName", title: "Parent name", width: 150 },
  { key: "parentPhone", title: "Parent phone", width: 120 },
  { key: "totalCharges", title: "Total fee", readOnly: true, type: "numeric", width: 110 },
  { key: "paid", title: "Paid", readOnly: true, type: "numeric", width: 100 },
  { key: "balance", title: "Balance", readOnly: true, type: "numeric", width: 100 },
];

export function DuesTable({
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
            <SortTh label="Student" ascValue="nameAsc" descValue="nameDesc" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
            <th style={thStyle}>Class</th>
            <th style={thStyle}>Branch</th>
            <SortTh label="Total fee" ascValue="totalFeeAsc" descValue="totalFeeDesc" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
            <SortTh label="Paid" ascValue="paidAsc" descValue="paidDesc" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
            <SortTh label="Balance" ascValue="balanceAsc" descValue="balanceDesc" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={{ borderTop: "1px solid #f3f4f6" }}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={tdStyle}>
                <StudentHoverCard studentId={r.id}>
                  <Link href={`/simple/students/${r.id}`} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                    {r.name}
                  </Link>
                </StudentHoverCard>
                {r.admissionNumber && <span style={{ color: "#9ca3af" }}> #{r.admissionNumber}</span>}
              </td>
              <td style={tdStyle}>{r.className || "—"}</td>
              <td style={tdStyle}>{r.branchName || "—"}</td>
              <td style={tdStyle}>{money(r.totalCharges)}</td>
              <td style={tdStyle}>{money(r.paid)}</td>
              <td style={tdStyle}>
                <strong style={{ color: "#b91c1c" }}>{money(r.balance)}</strong>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={7}>
                <span style={{ color: "#6b7280" }}>No pending dues match these filters.</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const excel = (
    <ExcelView
      columns={EXCEL_COLUMNS}
      rows={rows}
      idKey="id"
      onSave={(changed) => bulkUpdateStudentFields(changed as any)}
    />
  );

  return <ExcelViewToggle table={table} excel={excel} />;
}

const thStyle: React.CSSProperties = { padding: "10px 14px", fontSize: 12, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "10px 14px", color: "#111827" };
