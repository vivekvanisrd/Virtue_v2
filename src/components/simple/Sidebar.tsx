"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUPS: { label: string; links: { href: string; label: string }[] }[] = [
  {
    label: "",
    links: [
      { href: "/simple", label: "Dashboard" },
      { href: "/simple/help", label: "❓ Help & guide" },
    ],
  },
  {
    label: "Students",
    links: [
      { href: "/simple/students", label: "All students" },
      { href: "/simple/students/add", label: "Add student" },
    ],
  },
  {
    label: "Fees",
    links: [
      { href: "/simple/collect", label: "Collect a fee" },
      { href: "/simple/receipts", label: "Find a receipt" },
      { href: "/simple/reports", label: "Reports" },
    ],
  },
  {
    label: "Staff",
    links: [
      { href: "/simple/staff-attendance", label: "Staff attendance" },
      { href: "/simple/payroll", label: "Payroll" },
    ],
  },
  {
    label: "Setup",
    links: [
      { href: "/simple/fee-master", label: "Fee Master" },
      { href: "/simple/discounts", label: "Discounts" },
      { href: "/simple/sheet-sync", label: "Sheet sync" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  // Pick the single best-matching link (longest href that prefixes the
  // current path), so e.g. /simple/students/abc123 highlights "All students"
  // without also lighting up "Dashboard" (which would match "/simple" as a
  // naive prefix) or double-highlighting "Add student" on unrelated pages.
  const allLinks = NAV_GROUPS.flatMap((g) => g.links);
  const activeHref = allLinks
    .filter((link) => (link.href === "/simple" ? pathname === "/simple" : pathname.startsWith(link.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      style={{
        width: 220,
        flexShrink: 0,
        background: "#ffffff",
        borderRight: "1px solid #e5e7eb",
        padding: "16px 10px",
        minHeight: "calc(100vh - 57px)",
      }}
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.label || "root"} style={{ marginBottom: 18 }}>
          {group.label && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: "#9ca3af",
                textTransform: "uppercase",
                padding: "0 10px",
                marginBottom: 6,
              }}
            >
              {group.label}
            </div>
          )}
          <div style={{ display: "grid", gap: 2 }}>
            {group.links.map((link) => {
              const active = link.href === activeHref;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "block",
                    padding: "9px 10px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    color: active ? "#1d4ed8" : "#374151",
                    background: active ? "#eff6ff" : "transparent",
                    textDecoration: "none",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
