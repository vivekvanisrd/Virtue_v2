"use client";

import { Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { motion } from "framer-motion";

/**
 * DiscountRoadmap Component
 * 
 * Provides high-visibility clarity to parents/staff about how discounts
 * are reserved and realized specifically in Term 3 (Late-Realization model).
 * 
 * This adds a "Premium" feel by justifying early term payments while
 * reassuring the parent of their total savings.
 */
interface DiscountRoadmapProps {
  annualTuition: number;
  totalDiscount: number;
  term3Base: number;
  term3Net: number;
}

export const DiscountRoadmap = ({
  annualTuition,
  totalDiscount,
  term3Base,
  term3Net,
}: DiscountRoadmapProps) => {
  if (totalDiscount <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl shadow-sm mb-6 overflow-hidden relative"
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Info size={120} />
      </div>

      <div className="flex items-start gap-4 relative z-10">
        <div className="mt-1 bg-blue-100 p-2 rounded-full">
          <Info className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-blue-900 mb-1 tracking-tight uppercase">
            Scholarship & Discount Roadmap
          </h3>
          <p className="text-sm text-blue-800 leading-relaxed mb-4">
            A total benefit of{" "}
            <span className="font-extrabold text-blue-900 bg-blue-100 px-1 rounded">
              {formatCurrency(totalDiscount)}
            </span>{" "}
            is secured for this student. Per school policy, this benefit is fully applied to the <span className="font-bold underline underline-offset-4 decoration-blue-300">Final Term (Term 3)</span>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/60 backdrop-blur-sm p-4 rounded-lg border border-blue-100">
            <div className="space-y-1">
              <span className="text-[10px] text-blue-500 uppercase font-bold block">
                Term 3 Gross
              </span>
              <span className="text-lg font-medium text-blue-700">
                {formatCurrency(term3Base)}
              </span>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="h-px w-full bg-blue-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-blue-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                    Benefit Realized
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1 text-right">
              <span className="text-[10px] text-green-600 uppercase font-bold block">
                Payable in Term 3
              </span>
              <span className="text-2xl font-black text-green-700">
                {formatCurrency(term3Net)}
              </span>
            </div>
          </div>
          
          <p className="mt-3 text-[11px] text-blue-500 italic">
            * Early terms (Term 1 & 2) are payable at standard gross rates. Your total scholarship is protected and guaranteed for the final settlement.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
