"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Star, ArrowRight, Sparkles, ShieldAlert, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitParentFeedbackAction } from "@/lib/actions/feedback-actions";

interface Sibling {
  studentId: string;
  firstName: string;
  lastName: string;
  className: string;
  sectionName: string;
}

export function ParentFeedbackHub({
  siblings,
  activeStudentId
}: {
  siblings: Sibling[];
  activeStudentId?: string;
}) {
  const router = useRouter();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(activeStudentId || siblings[0]?.studentId || "");
  const [category, setCategory] = useState<string>("GENERAL");
  const [targetType, setTargetType] = useState<string>("School");
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (activeStudentId && activeStudentId !== selectedStudentId) {
      setSelectedStudentId(activeStudentId);
    }
  }, [activeStudentId]);

  const activeStudentName = siblings.find(s => s.studentId === selectedStudentId)?.firstName || "Student";

  const categories = [
    { value: "GENERAL", label: "General Feedback" },
    { value: "ACADEMIC", label: "Academic Curriculum" },
    { value: "TEACHER", label: "Teacher Instruction" },
    { value: "SCHOOL", label: "Campus & Infrastructure" },
    { value: "TRANSPORT", label: "Bus Route & Transport" },
    { value: "FEE", label: "Fees & Payment Gateways" },
    { value: "APP", label: "Mobile App & Portal Usability" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setAlert({ success: false, message: "Please provide your comments before submitting." });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const res = await submitParentFeedbackAction({
        studentId: selectedStudentId || null,
        category,
        targetType,
        rating,
        comment,
        isAnonymous
      });

      if (res.success) {
        setAlert({ success: true, message: "Thank you! Your suggestion has been successfully logged and sent to the administrator queue." });
        setComment("");
        setRating(5);
      } else {
        setAlert({ success: false, message: res.error || "Failed to log feedback." });
      }
    } catch (err: any) {
      setAlert({ success: false, message: "An unexpected error occurred during submission." });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* CSS Glassmorphism & Ring Glow Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .dark .glass-card {
          background: rgba(15, 23, 42, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .glow-star {
          filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.4));
        }
        .input-glow:focus {
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      `}} />

      {/* Header Block */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card border border-border/80 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" /> Suggestions & Review
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Submit feedback, report app errors, and review warded child academic services.</p>
        </div>

        {siblings.length > 1 && (
          <div className="flex items-center gap-3">
            <select
              value={selectedStudentId}
              onChange={(e) => {
                const sid = e.target.value;
                setSelectedStudentId(sid);
                router.push(`/parent/dashboard/feedback?studentId=${sid}`);
              }}
              className="bg-background border border-border/80 px-4 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-primary/50 cursor-pointer text-foreground"
            >
              {siblings.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.firstName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Panel */}
        <div className="lg:col-span-2 bg-card border border-border/80 p-6 rounded-3xl space-y-5">
          <h2 className="text-base font-black tracking-tight flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" /> Share your experience for <span className="text-primary">{activeStudentName}</span>
          </h2>

          {alert && (
            <div className={`p-4 rounded-xl border flex gap-3 ${
              alert.success 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
            }`}>
              {alert.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <ShieldAlert className="w-5 h-5 flex-shrink-0" />}
              <p className="text-xs font-bold leading-relaxed">{alert.message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider">Feedback Category</label>
                <select
                  value={category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setCategory(cat);
                    // Match Target Type automatically
                    if (cat === "TEACHER") setTargetType("Teacher");
                    else if (cat === "APP") setTargetType("Application");
                    else setTargetType("School");
                  }}
                  className="w-full bg-background border border-border/80 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-primary/50 text-foreground cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Target Type indicator */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider">Review Target Entity</label>
                <input
                  type="text"
                  disabled
                  value={targetType}
                  className="w-full bg-background/50 border border-border/60 px-3.5 py-2.5 rounded-xl text-xs font-bold text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            {/* Star Rating Section */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider">Overall Rating</label>
              <div className="flex items-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = (hoveredRating !== null ? star <= hoveredRating : star <= rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(null)}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 active:scale-95 transition-all focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          isActive 
                            ? "fill-amber-500 text-amber-500 glow-star" 
                            : "text-muted-foreground/30 hover:text-muted-foreground"
                        }`}
                      />
                    </button>
                  );
                })}
                <span className="text-xs font-extrabold text-muted-foreground ml-3 uppercase tracking-wider">
                  {rating === 1 ? "Poor" : rating === 2 ? "Fair" : rating === 3 ? "Good" : rating === 4 ? "Very Good" : "Excellent"}
                </span>
              </div>
            </div>

            {/* Comment Area */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider">Detailed Reviews & Suggestions</label>
              <textarea
                required
                rows={6}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write warded review comments, app bugs details, or suggestions for school improvement..."
                className="w-full bg-background border border-border/80 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-primary/50 text-foreground font-sans leading-relaxed input-glow"
              />
            </div>

            {/* Anonymous Toggle & Submit Button */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-border bg-background text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-black text-muted-foreground select-none group-hover:text-foreground transition-all">Submit Anonymously</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-black text-xs px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                {loading ? "Submitting Suggestion..." : (
                  <>
                    Submit Review Report <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Info Sidebar (Wow Factor) */}
        <div className="space-y-6">
          <div className="bg-card border border-border/85 p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Portal Policy</h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              We highly appreciate your reviews. Every ticket is sent directly to the school administrative moderation board for review.
            </p>
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <span className="text-[10px] uppercase font-black tracking-widest text-primary block mb-1">Response Time</span>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                Critical reviews are moderated and responded to within 1-2 school business days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
