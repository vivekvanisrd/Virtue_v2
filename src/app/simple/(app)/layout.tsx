import { getSovereignIdentity } from "@/lib/auth/backbone";
import { signOutAndRedirect } from "@/lib/actions/simple/auth-actions";
import { Sidebar } from "@/components/simple/Sidebar";
import { GlobalSearch } from "@/components/simple/GlobalSearch";
import { FontSizeControl } from "@/components/simple/FontSizeControl";

export const dynamic = "force-dynamic";

export default async function SimpleLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSovereignIdentity();

  return (
    <div className="simple-app" style={{ minHeight: "100vh", background: "#f4f6fb", color: "#111827" }}>
      {/* Zebra-striped tables and the font-size zoom apply everywhere under
       * .simple-app automatically — see FontSizeControl.tsx for the zoom
       * variable it sets, and VIRTUE_GOVERNANCE.md section 8 for the rule
       * that any UI change here must keep the Help page + tours in sync. */}
      <style>{`
        .simple-app table tbody tr:nth-child(odd) { background: #f8fafc; }
        .simple-app table tbody tr:hover { background: #eef2ff; }
        .simple-app main { zoom: var(--simple-zoom, 1); }
      `}</style>
      <header
        className="no-print"
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #4f46e5 100%)",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <a href="/simple" style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", textDecoration: "none", flexShrink: 0 }}>
          Fees &amp; Students
        </a>
        <GlobalSearch />
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <FontSizeControl />
          {identity && (
            <span style={{ fontSize: 14, color: "#e0e7ff" }}>
              {identity.name || identity.role} · <strong style={{ color: "#ffffff" }}>{identity.role}</strong>
            </span>
          )}
          <form action={signOutAndRedirect}>
            <button
              type="submit"
              style={{
                fontSize: 14,
                color: "#1e3a8a",
                background: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div className="no-print">
          <Sidebar />
        </div>
        <main style={{ flex: 1, minWidth: 0, padding: "24px 24px 48px" }}>{children}</main>
      </div>
    </div>
  );
}
