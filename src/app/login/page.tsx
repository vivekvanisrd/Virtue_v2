"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// Form Validation Schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    // Mimic API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Login data:", data);
    
    // In actual app, we would call an API here
    // Redirect to dashboard
    router.push("/dashboard");
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center gradient-bg p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/30 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 bg-white/5 backdrop-blur-2xl rounded-[40px] border border-white/10 overflow-hidden shadow-2xl premium-shadow"
      >
        {/* Left Side: Illustration & Branding */}
        <div className="relative hidden lg:flex flex-col justify-center p-16 text-white overflow-hidden bg-white/5 border-r border-white/5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-white fill-white" />
            </div>
            <h1 className="text-5xl font-bold mb-4 tracking-tight leading-tight">
              Virtue School <br />
              <span className="text-accent underline decoration-white/20 underline-offset-8">Next Gen</span>
            </h1>
            <p className="text-lg text-white/60 leading-relaxed font-light">
              Experience the evolution of campus management. 
              Lightning fast. Secure by design. Built for excellence.
            </p>
          </motion.div>

          {/* Social Proof/Features */}
          <div className="mt-12 space-y-6">
            {[
              { icon: ShieldCheck, text: "Enterprise-grade Data Encryption" },
              { icon: Zap, text: "sub-100ms Interaction Latency" },
              { icon: User, text: "Multi-role Workspace Isolation" }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + (i * 0.1) }}
                className="flex items-center gap-4 text-white/50"
              >
                <div className="p-2 bg-white/5 rounded-lg">
                  <feature.icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 lg:p-16 flex flex-col justify-center bg-white">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h2>
            <p className="text-slate-500 font-medium">Enter your credentials to access the ERP</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input
                  {...register("username")}
                  type="text"
                  placeholder="e.g. pandusir"
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-slate-800 font-medium",
                    errors.username && "border-red-500 focus:border-red-500"
                  )}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-red-500 font-bold ml-1 italic">{errors.username.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <button type="button" className="text-xs font-bold text-primary hover:underline">Forgot password?</button>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={cn(
                    "w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all text-slate-800 font-medium",
                    errors.password && "border-red-500 focus:border-red-500"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 font-bold ml-1 italic">{errors.password.message}</p>
              )}
            </div>

            <button
              disabled={isLoading}
              type="submit"
              className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Experience Reality
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer help */}
          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
             <p className="text-slate-400 text-sm font-medium">
               Authorized Personnel Only. Contact system administrator for access help.
             </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
