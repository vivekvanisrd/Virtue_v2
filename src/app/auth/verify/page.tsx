import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, User as UserIcon, Lock, Database } from "lucide-react";

export default async function AuthVerifyPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-10 rounded-[30px] shadow-2xl max-w-lg w-full">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Diagnostic</h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Auth & Session Sync</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Status Section */}
          <div className={`p-4 rounded-2xl flex items-center gap-4 ${user ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Server-Side Session</p>
              <p className={`text-lg font-black ${user ? 'text-green-700' : 'text-red-700'}`}>
                {user ? "AUTHENTICATED ✅" : "NOT FOUND ❌"}
              </p>
            </div>
          </div>

          {user && (
            <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100">
               <div className="flex items-start gap-3">
                  <UserIcon className="w-4 h-4 text-slate-400 mt-1" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">User Identity</p>
                    <p className="font-bold text-slate-700 break-all">{user.email}</p>
                    <p className="text-xs text-slate-400 font-mono mt-1">{user.id}</p>
                  </div>
               </div>
               
               <div className="flex items-start gap-3">
                  <Database className="w-4 h-4 text-slate-400 mt-1" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Auth Provider</p>
                    <p className="font-bold text-slate-700">{user.app_metadata?.provider || 'Supabase'}</p>
                  </div>
               </div>
            </div>
          )}

          {!user && (
             <div className="text-slate-500 text-sm p-4 bg-yellow-50 rounded-2xl border border-yellow-100 italic">
                The server is currently unable to read your session cookie. This usually means a middleware failure or a redirect loop.
             </div>
          )}

          {error && (
             <div className="text-red-500 text-sm p-4 bg-red-50 rounded-2xl border border-red-100 font-mono">
                Error: {error.message}
             </div>
          )}

          <div className="pt-6 border-t border-slate-100 space-y-2">
             <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
               <span>Supabase URL:</span>
               <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? "text-green-500" : "text-red-500"}>
                 {process.env.NEXT_PUBLIC_SUPABASE_URL ? "PRESENT ✅" : "MISSING ❌"}
               </span>
             </div>
             <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
               <span>Supabase Key:</span>
               <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "text-green-500" : "text-red-500"}>
                 {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "PRESENT ✅" : "MISSING ❌"}
               </span>
             </div>
             <p className="text-[10px] text-slate-300 mt-4 font-mono text-center">
                ENV: {process.env.NODE_ENV} | {new Date().toISOString()}
             </p>
          </div>
        </div>
      </div>
    </main>
  );
}
