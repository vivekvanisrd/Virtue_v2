import { BrandedPublicEnquiry } from "@/components/students/BrandedPublicEnquiry";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Enquiry Portal | PaVa-EDUX",
  description: "Official student registration and enquiry portal for PaVa-EDUX schools.",
};

interface PageProps {
  params: Promise<{ branchId: string }>;
}

export default async function PublicEnquiryPage({ params }: PageProps) {
  const { branchId } = await params;

  return (
    <main className="min-h-screen bg-slate-50/50 selection:bg-primary/20 selection:text-primary">
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/5 to-transparent -z-10" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] -z-10 rounded-full opacity-50" />
      
      <BrandedPublicEnquiry branchId={branchId} />
      
      <div className="max-w-2xl mx-auto pb-20 px-6 text-center">
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
            Secure Enrollment Portal &bull; SSL Encrypted &bull; ISO 27001 Compliant Data Storage
            <br />
            &copy; 2026 PaVa-EDUX Education Systems. All Rights Reserved.
         </p>
      </div>
    </main>
  );
}
