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
  { key: "firstName", title: "First name", width: 130 },
  { key: "lastName", title: "Last name", width: 120 },
  { key: "className", title: "Class", readOnly: true, width: 100 },
  { key: "parentName", title: "Parent name", width: 150 },
  { key: "parentPhone", title: "Parent phone", width: 120 },
  { key: "tuitionFee", title: "Tuition fee", type: "numeric", width: 110 },
  { key: "admissionFee", title: "Admission fee", type: "numeric", width: 110 },
  { key: "transportFee", title: "Transport fee", type: "numeric", width: 110 },
  { key: "concession", title: "Concession", type: "numeric", width: 110 },
  { key: "paid", title: "Paid", readOnly: true, type: "numeric", width: 100 },
  { key: "balance", title: "Balance", readOnly: true, type: "numeric", width: 100 },
];

export function StudentsTable({
  students,
  page,
  pageSize,
  sortBy,
  basePath,
  searchParams,
}: {
  students: any[];
  page: number;
  pageSize: number;
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
            <SortTh label="Name" ascValue="name" descValue="nameDesc" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
            <SortTh label="Admission #" ascValue="admissionNumber" descValue="admissionNumberDesc" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
            <SortTh label="Class" ascValue="class" descValue="classDesc" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
            <th style={thStyle}>Branch</th>
            <th style={thStyle}>Parent</th>
            <SortTh label="Total fee" ascValue="totalFeeAsc" descValue="totalFee" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
            <SortTh label="Paid" ascValue="paidAsc" descValue="paid" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
            <SortTh label="Balance" ascValue="balanceAsc" descValue="balance" currentSort={sortBy} basePath={basePath} searchParams={searchParams} />
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => (
            <tr key={s.id} style={{ borderTop: "1px solid #f3f4f6" }}>
              <td style={tdStyle}>{(page - 1) * pageSize + i + 1}</td>
              <td style={tdStyle}>
                <StudentHoverCard studentId={s.id}>
                  <Link href={`/simple/students/${s.id}`} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                    {s.name}
                  </Link>
                </StudentHoverCard>
              </td>
              <td style={tdStyle}>{s.admissionNumber || "—"}</td>
              <td style={tdStyle}>{s.className || "—"}</td>
              <td style={tdStyle}>{s.branchName || "—"}</td>
              <td style={tdStyle}>
                {s.parentName || "—"}
                {s.parentPhone && <div style={{ color: "#9ca3af", fontSize: 12 }}>{s.parentPhone}</div>}
              </td>
              <td style={tdStyle}>{money(s.totalCharges)}</td>
              <td style={tdStyle}>{money(s.paid)}</td>
              <td style={tdStyle}>
                <strong style={{ color: s.balance > 0 ? "#b91c1c" : "#15803d" }}>{money(s.balance)}</strong>
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={9}>
                <span style={{ color: "#6b7280" }}>No students match these filters.</span>
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
      rows={students}
      idKey="id"
      onSave={(changed) => bulkUpdateStudentFields(changed as any)}
    />
  );

  return <ExcelViewToggle table={table} excel={excel} />;
}

const thStyle: React.CSSProperties = { padding: "10px 14px", fontSize: 12, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "10px 14px", color: "#111827" };
