import { getConsentByTokenAction } from "@/lib/actions/consent-actions";
import { ConsentForm } from "@/components/students/consent-form";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Student Re-admission Consent | Virtue Modern School",
};

export default async function ConsentPage({ params }: { params: { token: string } }) {
  // Fetch consent data server-side
  const result = await getConsentByTokenAction(params.token);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center p-4 text-center">
        <div className="bg-[#0f172a] border border-rose-500/30 p-8 rounded-3xl max-w-sm w-full">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-rose-400 text-2xl">!</span>
          </div>
          <h1 className="text-xl font-black text-white mb-2">Invalid Link</h1>
          <p className="text-sm text-slate-400 font-medium">This consent link is either invalid, expired, or has been revoked by the administration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1c] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a2342] via-[#0a0f1c] to-[#0a0f1c] py-20 px-4 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
      
      {/* Navbar Minimal */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">V</div>
          <span className="text-white font-black tracking-tighter text-lg hidden sm:block">Virtue Modern School</span>
        </div>
      </div>

      <div className="relative z-10 pt-10">
        <ConsentForm token={params.token} consentData={result.data} />
      </div>
    </div>
  );
}
