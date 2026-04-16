import { BrandedPublicPaymentReview } from "@/components/students/BrandedPublicPaymentReview";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review & Pay | Admission Portal",
  description: "Secure payment portal for PaVa-EDUX admission and term fees.",
};

interface PageProps {
  params: Promise<{ enquiryId: string }>;
}

export default async function PublicPaymentPage({ params }: PageProps) {
  const { enquiryId } = await params;

  return (
    <main className="min-h-screen bg-slate-950">
      <BrandedPublicPaymentReview enquiryId={enquiryId} />
    </main>
  );
}
