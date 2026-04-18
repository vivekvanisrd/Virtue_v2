"use client";

import { useState } from "react";
import { initializeInstitutionAction } from "@/lib/actions/genesis-actions";
import { 
  Rocket, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  Wallet,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// 🏛️ SOVEREIGN UI INLINE: Replacing missing UI components with native Tailwind standards
const Button = ({ children, className, variant, asChild, ...props }: any) => {
  const baseClass = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants: any = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground"
  };
  
  return (
    <button 
      className={cn(baseClass, variants[variant || "default"], className)} 
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className }: any) => (
  <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}>
    {children}
  </div>
);

const CardHeader = ({ children, className }: any) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>
);

const CardTitle = ({ children, className }: any) => (
  <h3 className={cn("font-semibold leading-none tracking-tight", className)}>{children}</h3>
);

const CardDescription = ({ children, className }: any) => (
  <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
);

const CardContent = ({ children, className }: any) => (
  <div className={cn("p-6 pt-0", className)}>{children}</div>
);

/**
 * 🔓 INSTITUTIONAL GENESIS CONSOLE (v2.3)
 * 
 * High-fidelity administrative utility to bootstrap Academy foundations.
 */
export default function GenesisPage() {
    const [isInitializing, setIsInitializing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenesis = async () => {
        setIsInitializing(true);
        setError(null);
        setResult(null);

        try {
            const res = await initializeInstitutionAction();
            if (res.success) {
                setResult(res);
                alert(res.message);
                if (res.isAlreadyInitialized) {
                    alert("Institutional Foundation already exists.");
                }
            } else {
                setError(res.error || "Critical initialization failure.");
                alert("Genesis Collapse: " + res.error);
            }
        } catch (e: any) {
            setError(e.message);
            alert("System Error: " + e.message);
        } finally {
            setIsInitializing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto">
            {/* 🏛️ Header Section */}
            <header className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold tracking-widest uppercase border border-blue-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    Sovereign Setup Hub
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                    Institutional <span className="text-blue-500">Genesis</span>
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl">
                    Lifts the institutional Admission Lock by instantiating the Academic Blueprint and the Financial Baseline in a single atomic transaction.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {/* 🚀 Trigger Console */}
                <Card className="bg-zinc-950/50 border-zinc-800 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Rocket className="w-24 h-24" />
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Database className="w-5 h-5 text-blue-500" />
                            Core Initialization
                        </CardTitle>
                        <CardDescription className="text-zinc-500">
                            Create Grades 1-10, Sections A/B, and the mandatory Fee Component Master.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-4 items-start">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                            <p className="text-sm text-amber-500/80 leading-relaxed font-medium">
                                IMPORTANT: This action is Idempotent. It will not duplicate data if classes already exist. It is a high-rigor administrative trigger.
                            </p>
                        </div>
                        
                        <Button 
                            onClick={handleGenesis}
                            disabled={isInitializing}
                            className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/20 group transition-all"
                        >
                            {isInitializing ? (
                                <span className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Synchronizing DNA...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Initialize Sovereign Academy
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* 💰 Financial Foundation */}
                <Card className="bg-zinc-950/50 border-zinc-800 backdrop-blur-xl group hover:border-emerald-500/30 transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Wallet className="w-5 h-5 text-emerald-500" />
                            Fee Genesis
                        </CardTitle>
                        <CardDescription className="text-zinc-500">
                            Establishes a baseline Universal Fee Plan for every created grade.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ul className="space-y-3">
                            {[
                                "Master Tuition Component Created",
                                "Annual ₹25,000 Plan Assigned",
                                "Term-based Logic Initialized",
                                "Accounting Ledger Ready"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm text-zinc-400 font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* 📊 Result Manifest */}
            <AnimatePresence mode="wait">
                {result && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-4"
                    >
                        <div className="flex items-center gap-3 text-emerald-400">
                            <CheckCircle2 className="w-8 h-8" />
                            <div>
                                <h3 className="text-xl font-bold">Genesis Manifest Certified</h3>
                                <p className="text-sm opacity-80">{result.message}</p>
                            </div>
                        </div>
                        {result.createdCount > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Grades Synced</p>
                                    <p className="text-2xl font-bold text-white">{result.createdCount}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Sections Synced</p>
                                    <p className="text-2xl font-bold text-white">{result.createdCount * 2}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Adm Layer</p>
                                    <p className="text-2xl font-bold text-blue-400 font-mono italic uppercase">UNLOCKED</p>
                                </div>
                                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Status</p>
                                    <p className="text-2xl font-bold text-emerald-400 italic">READY</p>
                                </div>
                            </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-emerald-500/10">
                            <Button variant="outline" className="text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10" asChild>
                                <a href="/dashboard/students/add">Proceed to Admission <ArrowRight className="w-4 h-4 ml-2" /></a>
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <div className="mt-8 p-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-4 items-start">
                    <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                    <div>
                        <h3 className="text-lg font-bold text-red-500">Genesis Collapse</h3>
                        <p className="text-sm text-red-500/80">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
