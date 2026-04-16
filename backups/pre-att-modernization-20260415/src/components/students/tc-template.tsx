"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

interface TCTemplateProps {
  data: {
    fullName: string;
    fatherName: string;
    motherName: string;
    dob: Date | string;
    admissionDate: Date | string;
    lastClass: string;
    tcNumber: string;
    exitDate: Date | string;
    schoolName: string;
  };
}

export function TCTemplate({ data }: TCTemplateProps) {
  return (
    <div className="bg-background p-[1in] w-[8.27in] min-h-[11.69in] mx-auto shadow-2xl border border-border print:shadow-none print:border-none print:m-0 print:w-full font-serif text-foreground">
      {/* Header */}
      <div className="text-center border-b-4 border-double border-foreground pb-6 mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-foreground text-background">
            <ShieldCheck className="w-10 h-10" />
          </div>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-1">{data.schoolName}</h1>
        <p className="text-sm font-bold uppercase tracking-widest text-foreground opacity-60">Recognized by Department of Education • Affiliation No: 123456</p>
        <p className="text-xs font-medium text-foreground opacity-50 mt-1">Main Campus, Bengaluru, Karnataka - 560001</p>
      </div>

      {/* Title */}
      <div className="text-center mb-10">
        <h2 className="text-2xl font-black uppercase tracking-[0.2em] border-y border-foreground py-2 inline-block px-10">Transfer Certificate</h2>
        <div className="mt-4 flex justify-between px-4 text-xs font-bold uppercase tracking-widest text-foreground opacity-50">
          <span>Sl. No: <span className="text-foreground">{data.tcNumber}</span></span>
          <span>Date: <span className="text-foreground">{new Date(data.exitDate).toLocaleDateString()}</span></span>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-6 text-sm leading-8">
        <p>
          This is to certify that <span className="font-black border-b border-dotted border-foreground opacity-20 px-2 uppercase">{data.fullName}</span>, 
          Son/Daughter of Shri <span className="font-black border-b border-dotted border-foreground opacity-20 px-2 uppercase">{data.fatherName}</span> 
          and Smt. <span className="font-black border-b border-dotted border-foreground opacity-20 px-2 uppercase">{data.motherName}</span>, 
          was admitted to this school on <span className="font-black border-b border-dotted border-foreground opacity-20 px-2">{new Date(data.admissionDate).toLocaleDateString()}</span> 
          in Class <span className="font-black border-b border-dotted border-foreground opacity-20 px-2">{data.lastClass}</span>.
        </p>

        <p>
          His/Her Date of Birth according to the Admission Register is <span className="font-black border-b border-dotted border-foreground opacity-20 px-2">{new Date(data.dob).toLocaleDateString()}</span>.
        </p>

        <p>
          He/She has passed/appeared in the final examination of Class <span className="font-black border-b border-dotted border-foreground opacity-20 px-2">{data.lastClass}</span> 
          and was found <span className="font-black border-b border-dotted border-foreground opacity-20 px-2">PASS/ELIGIBLE</span> for promotion to next higher class.
        </p>

        <p>
          All dues to the school have been cleared by the student up to <span className="font-black border-b border-dotted border-foreground opacity-20 px-2">{new Date().toLocaleDateString()}</span>.
        </p>

        <p>
          His/Her conduct and character during the period of stay in this school has been <span className="font-black border-b border-dotted border-foreground opacity-20 px-2 uppercase tracking-widest">Satisfactory</span>.
        </p>
      </div>

      {/* Footer / Signatures */}
      <div className="mt-24 grid grid-cols-3 gap-10 text-center">
        <div className="border-t border-foreground pt-2">
          <p className="text-[10px] font-black uppercase tracking-widest">Class Teacher</p>
        </div>
        <div className="border-t border-foreground pt-2">
          <p className="text-[10px] font-black uppercase tracking-widest">Office Assistant</p>
        </div>
        <div className="border-t border-foreground pt-2 relative">
           <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-20">
              <div className="w-20 h-20 border-4 border-foreground rounded-full flex items-center justify-center font-black text-[8px] uppercase">School Seal</div>
           </div>
          <p className="text-[10px] font-black uppercase tracking-widest">Principal</p>
        </div>
      </div>

      <div className="mt-20 text-[8px] text-foreground opacity-40 text-center uppercase tracking-[0.3em]">
        Generated automatically by PaVa-EDUX Education Management System
      </div>
    </div>
  );
}
