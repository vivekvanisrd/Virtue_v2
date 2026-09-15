"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAction } from "@/lib/actions/auth-native";

export default function SimpleLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Enter your username/email and password.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const res = await signInAction({ identifier: identifier.trim(), password });

    if (!res.success) {
      setError(res.error || "Invalid credentials.");
      setIsLoading(false);
      return;
    }

    if ((res as any).mustChangePassword) {
      router.push("/change-password");
    } else {
      router.push("/simple");
    }
    setIsLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f5", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 32,
          display: "grid",
          gap: 18,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Fees &amp; Students</h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 14 }}>Sign in to the simple fees module.</p>
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px" }}>
            {error}
          </p>
        )}

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, color: "#374151" }}>Username or email</span>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, color: "#374151" }}>Password</span>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, width: "100%", paddingRight: 60 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 12,
                fontWeight: 600,
                color: "#6b7280",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            fontSize: 16,
            fontWeight: 600,
            padding: "14px 16px",
            borderRadius: 10,
            border: "none",
            background: isLoading ? "#93c5fd" : "#2563eb",
            color: "#ffffff",
            cursor: isLoading ? "default" : "pointer",
          }}
        >
          {isLoading ? "Signing in…" : "Sign in"}
        </button>

        <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
          Same credentials as the main portal — this just takes you straight to Fees &amp; Students.
        </p>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontSize: 16,
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  color: "#111827",
  background: "#ffffff",
};
