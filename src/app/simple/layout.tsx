import { getSovereignIdentity } from "@/lib/auth/backbone";
import { signOutAction } from "@/lib/actions/auth-native";
import { Sidebar } from "@/components/simple/Sidebar";

export const dynamic = "force-dynamic";

export default async function SimpleLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSovereignIdentity();

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f5", color: "#111827" }}>
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <a href="/simple" style={{ fontSize: 20, fontWeight: 700, color: "#111827", textDecoration: "none" }}>
          Fees &amp; Students
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {identity && (
            <span style={{ fontSize: 14, color: "#374151" }}>
              {identity.name || identity.role} · <strong>{identity.role}</strong>
            </span>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              style={{
                fontSize: 14,
                color: "#374151",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, padding: "24px 24px 48px" }}>
          <div style={{ maxWidth: 900 }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
