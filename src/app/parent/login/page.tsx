"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { requestGuardianOtpAction, verifyGuardianOtpAction, loginGuardianWithPasswordAction } from "@/lib/actions/guardian-auth-actions";
import { Loader2, ShieldCheck, Mail, Lock, CheckCircle, AlertCircle, Sparkles } from "lucide-react";

export default function ParentLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"password" | "email" | "otp">("password");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setLoading(true);
    setMessage("");
    setIsError(false);

    const res = await loginGuardianWithPasswordAction(identifier, password);
    setLoading(false);

    if (res.success) {
      router.push("/parent/dashboard");
    } else {
      setIsError(true);
      setMessage(res.error || "Login failed.");
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    setLoading(true);
    setMessage("");
    setIsError(false);

    const res = await requestGuardianOtpAction(identifier);
    setLoading(false);

    if (res.success) {
      setStep("otp");
      setMessage("Verification code generated successfully.");
    } else {
      setIsError(true);
      setMessage(res.error || "Failed to request code.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    setMessage("");
    setIsError(false);

    const res = await verifyGuardianOtpAction(identifier, otp);
    setLoading(false);

    if (res.success) {
      router.push("/parent/dashboard");
    } else {
      setIsError(true);
      setMessage(res.error || "Verification failed.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center relative overflow-hidden px-4">
      {/* Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full bg-card border border-border/80 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl text-primary-foreground">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black tracking-tight text-center mb-2">PaVa-EDUX Parent Portal</h2>
        <p className="text-sm opacity-60 text-center mb-8 font-medium">
          {step === "password" ? "Log in using your registered email/phone and password." : "Verify your registered email or phone to receive a code."}
        </p>

        {message && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${isError ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
            {isError ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
            <span>{message}</span>
          </div>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block">Email or Phone Number</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. parent@example.com or 9848397697"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-foreground placeholder-foreground/30 font-bold focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-foreground placeholder-foreground/30 font-bold focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !identifier || !password}
              className="w-full py-4 bg-primary hover:opacity-90 text-primary-foreground font-black rounded-xl transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In</>}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setMessage("");
                setIsError(false);
              }}
              className="w-full text-center text-xs font-bold opacity-50 hover:text-primary transition-colors mt-2 cursor-pointer"
            >
              Sign In with Verification Code (OTP) instead
            </button>
          </form>
        )}

        {step === "email" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block">Email or Phone Number</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. parent@example.com or 9848397697"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-foreground placeholder-foreground/30 font-bold focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !identifier}
              className="w-full py-4 bg-primary hover:opacity-90 text-primary-foreground font-black rounded-xl transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Request Verification Code</>}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("password");
                setMessage("");
                setIsError(false);
              }}
              className="w-full text-center text-xs font-bold opacity-50 hover:text-primary transition-colors mt-2 cursor-pointer"
            >
              Back to Password Sign In
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block">Enter 6-Digit OTP</label>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-center text-2xl tracking-widest text-foreground placeholder-foreground/20 font-black focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-4 bg-primary hover:opacity-90 text-primary-foreground font-black rounded-xl transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Access Portal</>}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setMessage("");
                setIsError(false);
              }}
              className="w-full text-center text-xs font-bold opacity-50 hover:text-primary transition-colors mt-2 cursor-pointer"
            >
              Change Log In Details
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 text-center opacity-40 text-xs font-bold flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" /> Powered by virtue-v2 Enterprise Core
      </div>
    </div>
  );
}
