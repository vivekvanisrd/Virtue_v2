"use client";

import { ExcelViewToggle } from "@/components/simple/ExcelViewToggle";
import { ExcelView, type ExcelColumn } from "@/components/simple/ExcelView";
import { bulkUpdateDiscountTypes } from "@/lib/actions/simple/fee-master-actions";

const EXCEL_COLUMNS: ExcelColumn[] = [
  { key: "name", title: "Name", width: 220 },
  { key: "kind", title: "Kind (₹ or %)", readOnly: true, width: 110 },
  { key: "value", title: "Value", type: "numeric", width: 100 },
  { key: "branchName", title: "Branch", readOnly: true, width: 150 },
  { key: "isActive", title: "Active", readOnly: true, width: 90 },
];

export function DiscountTypesTable({ rows }: { rows: any[] }) {
  const table = (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f9fafb", textAlign: "left" }}>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Value</th>
            <th style={thStyle}>Branch</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d, i) => (
            <tr key={d.id} style={{ borderTop: "1px solid #f3f4f6" }}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={tdStyle}>{d.name}</td>
              <td style={tdStyle}>{d.amount != null ? `₹${d.amount.toLocaleString("en-IN")}` : d.percentage != null ? `${d.percentage}%` : "—"}</td>
              <td style={tdStyle}>{d.branchName}</td>
              <td style={tdStyle}>
                <span style={{ color: d.isActive ? "#15803d" : "#9ca3af" }}>{d.isActive ? "Active" : "Inactive"}</span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={5}>
                <span style={{ color: "#6b7280" }}>No discount types yet — add one above.</span>
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
      rows={rows.map((r) => ({ ...r, isActive: r.isActive ? "Active" : "Inactive" }))}
      idKey="id"
      onSave={(changed) => bulkUpdateDiscountTypes(changed as any)}
    />
  );

  return <ExcelViewToggle table={table} excel={excel} />;
}

const thStyle: React.CSSProperties = { padding: "10px 14px", fontSize: 12, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "10px 14px", color: "#111827" };
