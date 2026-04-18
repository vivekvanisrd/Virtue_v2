import prisma from "@/lib/prisma";
import { FeeReceipt } from "@/components/finance/FeeReceipt";
import { notFound } from "next/navigation";

// Next.js 14/15 Page
export default async function ReceiptViewerPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Extract and clean the array of receipt IDs passed in via the URL params
  // Handles strings produced by `.join(", ")` returning `VIVA-REC-01%2C%20VIVA-REC-02`
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const receiptNumbers = decodedId.split(",").map(r => r.trim()).filter(Boolean);

  if (receiptNumbers.length === 0) return notFound();

  const collections = await prisma.collection.findMany({
    where: { receiptNumber: { in: receiptNumbers } },
    include: {
      student: {
        include: {
          academic: { include: { class: true, section: true } }
        }
      }
    }
  });

  if (collections.length === 0) return notFound();

  // If there are multiple receipts (batch Sibling link), they stack cleanly
  // with page breaks already engineered inside FeeReceipt if needed, 
  // or we can wrap them in a flex-col layout.
  
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="flex flex-col items-center gap-12 max-w-5xl mx-auto">
        <div className="text-center print:hidden mb-4">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-2">Payment Receipt(s)</h1>
          <p className="text-sm font-medium text-slate-500">
            Thank you for your payment. Please keep this document for your records.
          </p>
        </div>

        {collections.map((collection: any) => {
          const serializedCollection = {
            ...collection,
            amountPaid: Number(collection.amountPaid || 0),
            lateFeePaid: Number(collection.lateFeePaid || 0),
            convenienceFee: Number(collection.convenienceFee || 0),
            totalPaid: Number(collection.totalPaid || 0),
          };

          return (
            <div key={collection.id} className="w-full relative">
              <FeeReceipt student={collection.student} receipt={serializedCollection} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
