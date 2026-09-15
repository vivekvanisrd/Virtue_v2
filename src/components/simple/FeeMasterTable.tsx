"use client";

import { ExcelViewToggle } from "@/components/simple/ExcelViewToggle";
import { ExcelView, type ExcelColumn } from "@/components/simple/ExcelView";
import { bulkUpdateFeeMaster } from "@/lib/actions/simple/fee-master-actions";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const EXCEL_COLUMNS: ExcelColumn[] = [
  { key: "branchName", title: "Branch", readOnly: true, width: 150 },
  { key: "className", title: "Class", readOnly: true, width: 110 },
  { key: "sectionName", title: "Section", readOnly: true, width: 90 },
  { key: "yearName", title: "Academic year", readOnly: true, width: 110 },
  { key: "tuitionFee", title: "Tuition", type: "numeric", width: 110 },
  { key: "admissionFee", title: "Admission", type: "numeric", width: 110 },
  { key: "transportFee", title: "Transport", type: "numeric", width: 110 },
  { key: "totalAmount", title: "Total", readOnly: true, type: "numeric", width: 110 },
];

export function FeeMasterTable({ rows }: { rows: any[] }) {
  const table = (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f9fafb", textAlign: "left" }}>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Branch</th>
            <th style={thStyle}>Class</th>
            <th style={thStyle}>Section</th>
            <th style={thStyle}>Academic year</th>
            <th style={thStyle}>Tuition</th>
            <th style={thStyle}>Admission</th>
            <th style={thStyle}>Transport</th>
            <th style={thStyle}>Total</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={{ borderTop: "1px solid #f3f4f6" }}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={tdStyle}>{r.branchName}</td>
              <td style={tdStyle}>{r.className}</td>
              <td style={tdStyle}>{r.sectionName || "Whole class"}</td>
              <td style={tdStyle}>
                {r.yearName} {r.isCurrentYear && <span style={{ color: "#15803d", fontSize: 12 }}>(current)</span>}
              </td>
              <td style={tdStyle}>{money(r.tuitionFee)}</td>
              <td style={tdStyle}>{money(r.admissionFee)}</td>
              <td style={tdStyle}>{money(r.transportFee)}</td>
              <td style={tdStyle}><strong>{money(r.totalAmount)}</strong></td>
              <td style={tdStyle}>
                <span style={{ color: r.isActive ? "#15803d" : "#9ca3af" }}>{r.isActive ? "Active" : "Inactive"}</span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={10}>
                <span style={{ color: "#6b7280" }}>No fee master entries yet — add one above.</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const excel = <ExcelView columns={EXCEL_COLUMNS} rows={rows} idKey="id" onSave={(changed) => bulkUpdateFeeMaster(changed as any)} />;

  return <ExcelViewToggle table={table} excel={excel} />;
}

const thStyle: React.CSSProperties = { padding: "10px 14px", fontSize: 12, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "10px 14px", color: "#111827" };
