"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { logClientErrorAction } from "@/lib/actions/error-actions";
import { AlertTriangle, RefreshCw, Bug, ShieldAlert } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  isLogging: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorId: null,
    isLogging: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: null,
      isLogging: true,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const route = typeof window !== "undefined" ? window.location.pathname : undefined;

    // Send error report to server
    logClientErrorAction({
      message: error.message || "Uncaught React Component Error",
      stack: `${error.stack || ""}\n\nComponent Stack:\n${errorInfo.componentStack || ""}`,
      errorName: error.name || "ReactRenderError",
      route,
      component: this.props.componentName || "ReactComponent",
      severity: "HIGH",
      metadata: {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
    })
      .then((res) => {
        if (res.success && res.errorId) {
          this.setState({ errorId: res.errorId, isLogging: false });
        } else {
          this.setState({ isLogging: false });
        }
      })
      .catch(() => {
        this.setState({ isLogging: false });
      });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[300px] w-full flex items-center justify-center p-6 bg-slate-900/90 text-white rounded-xl border border-red-500/30 shadow-2xl backdrop-blur-md">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-100 tracking-tight">
              Component Error Intercepted
            </h3>

            <p className="text-sm text-slate-400 leading-relaxed">
              An unexpected interface error occurred. Our automated Sentinel has logged the crash details for developer inspection.
            </p>

            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-left font-mono text-xs text-red-300 overflow-x-auto max-h-32">
                <span className="text-slate-500 select-none">$ </span>
                {this.state.error.message}
              </div>
            )}

            {this.state.errorId && (
              <div className="text-xs text-slate-400 font-mono bg-slate-800/60 py-1.5 px-3 rounded-full inline-block border border-slate-700">
                Log Reference: <span className="text-cyan-400 font-bold">{this.state.errorId}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-lg shadow-md transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
