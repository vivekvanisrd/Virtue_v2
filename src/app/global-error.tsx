"use client";

import React, { useEffect } from "react";
import { logClientErrorAction } from "@/lib/actions/error-actions";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log crash to PostgreSQL SystemErrorLog table
    logClientErrorAction({
      message: error.message || "Global Next.js App Crash",
      stack: error.stack,
      digest: error.digest,
      errorName: error.name || "GlobalNextError",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      severity: "CRITICAL",
    });
  }, [error]);

  return (
    <html>
      <body className="bg-slate-950 text-white flex items-center justify-center min-h-screen font-sans p-6">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-100">System Error Encountered</h2>
          <p className="text-sm text-slate-400">
            An unexpected global error occurred. Our diagnostics Sentinel has logged the incident to the database and alerted administrators via email.
          </p>

          {error.digest && (
            <p className="text-xs font-mono text-cyan-400 bg-slate-950 py-1.5 px-3 rounded-lg inline-block border border-slate-800">
              Digest Code: {error.digest}
            </p>
          )}

          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-xl shadow-lg hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-95"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
