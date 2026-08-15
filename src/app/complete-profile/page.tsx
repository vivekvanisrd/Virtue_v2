"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    User, Phone, Mail, Calendar, MapPin, Shield, Landmark, 
    CreditCard, CheckCircle2, AlertCircle, Loader2, Sparkles, ArrowRight 
} from "lucide-react";
import { getStaffProfileForCompletionAction, completeStaffProfileAction, CompleteProfileInput } from "@/lib/actions/complete-profile-action";

export default function CompleteProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [form, setForm] = useState<CompleteProfileInput & { firstName?: string; lastName?: string }>({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        dob: "",
        gender: "MALE",
        address: "",
        aadhaarNumber: "",
        panNumber: "",
        accountName: "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
    });

    useEffect(() => {
        async function loadProfile() {
            setLoading(true);
            const res = await getStaffProfileForCompletionAction();
            if (res.success && res.data) {
                setForm(res.data);
            } else if (res.error) {
                setErrorMessage(res.error);
            }
            setLoading(false);
        }
        loadProfile();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setErrorMessage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMessage(null);

        const res = await completeStaffProfileAction({
            phone: form.phone,
            email: form.email,
            dob: form.dob,
            gender: form.gender,
            address: form.address,
            aadhaarNumber: form.aadhaarNumber,
            panNumber: form.panNumber,
            accountName: form.accountName,
            accountNumber: form.accountNumber,
            ifscCode: form.ifscCode,
            bankName: form.bankName,
        });

        if (res.success && res.redirectUrl) {
            router.push(res.redirectUrl);
            router.refresh();
        } else {
            setErrorMessage(res.error || "Failed to update profile details.");
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="text-slate-400 font-medium animate-pulse">Loading profile details...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto w-full space-y-8">
                {/* Header Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900 p-8 border border-blue-500/20 backdrop-blur-xl shadow-2xl">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center gap-3 text-blue-400 font-semibold tracking-wide text-xs uppercase mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Staff Onboarding Portal</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                        Complete Your Staff Profile
                    </h1>
                    <p className="mt-2 text-slate-300 text-sm leading-relaxed max-w-xl">
                        Welcome to Virtue! Please verify and complete your essential details below to unlock full access to your staff dashboard and mobile app.
                    </p>
                </div>

                {errorMessage && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-sm animate-fade-in shadow-lg">
                        <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section 1: Basic Information */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-5">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Personal Information</h2>
                                <p className="text-xs text-slate-400">Your core contact and personal identity details</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    disabled
                                    value={`${form.firstName || ""} ${form.lastName || ""}`.trim()}
                                    className="w-full bg-slate-950/50 border border-slate-800 text-slate-400 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Phone Number *
                                </label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        required
                                        maxLength={10}
                                        value={form.phone || ""}
                                        onChange={handleChange}
                                        placeholder="10-digit mobile number"
                                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email || ""}
                                        onChange={handleChange}
                                        placeholder="staff@virtueschool.in"
                                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Date of Birth
                                </label>
                                <div className="relative">
                                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                    <input
                                        type="date"
                                        name="dob"
                                        value={form.dob || ""}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Gender
                                </label>
                                <select
                                    name="gender"
                                    value={form.gender || "MALE"}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl px-4 py-2.5 text-sm transition-all"
                                >
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Residential Address
                                </label>
                                <div className="relative">
                                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                    <textarea
                                        name="address"
                                        rows={2}
                                        value={form.address || ""}
                                        onChange={handleChange}
                                        placeholder="Full home address..."
                                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl pl-10 pr-4 py-2 text-sm transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Statutory Verification */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-5">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Statutory & Verification</h2>
                                <p className="text-xs text-slate-400">Government identification details for payroll compliance</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Aadhaar Number (12 digits)
                                </label>
                                <input
                                    type="text"
                                    name="aadhaarNumber"
                                    maxLength={12}
                                    value={form.aadhaarNumber || ""}
                                    onChange={handleChange}
                                    placeholder="123456789012"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white rounded-xl px-4 py-2.5 text-sm transition-all tracking-widest font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    PAN Card Number (10 alphanumeric)
                                </label>
                                <input
                                    type="text"
                                    name="panNumber"
                                    maxLength={10}
                                    value={form.panNumber || ""}
                                    onChange={handleChange}
                                    placeholder="ABCDE1234F"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white rounded-xl px-4 py-2.5 text-sm transition-all uppercase tracking-widest font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Bank Account */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-5">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <Landmark className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Banking Details</h2>
                                <p className="text-xs text-slate-400">Bank account details for monthly salary credit</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Account Holder Name
                                </label>
                                <input
                                    type="text"
                                    name="accountName"
                                    value={form.accountName || ""}
                                    onChange={handleChange}
                                    placeholder="Name as per bank passbook"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white rounded-xl px-4 py-2.5 text-sm transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Account Number
                                </label>
                                <div className="relative">
                                    <CreditCard className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                    <input
                                        type="text"
                                        name="accountNumber"
                                        value={form.accountNumber || ""}
                                        onChange={handleChange}
                                        placeholder="Bank account number"
                                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    IFSC Code
                                </label>
                                <input
                                    type="text"
                                    name="ifscCode"
                                    maxLength={11}
                                    value={form.ifscCode || ""}
                                    onChange={handleChange}
                                    placeholder="SBIN0001234"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white rounded-xl px-4 py-2.5 text-sm transition-all uppercase tracking-widest font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Bank Name
                                </label>
                                <input
                                    type="text"
                                    name="bankName"
                                    value={form.bankName || ""}
                                    onChange={handleChange}
                                    placeholder="e.g. State Bank of India"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white rounded-xl px-4 py-2.5 text-sm transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Action */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-3 text-base disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Saving Profile & Updating Session...</span>
                                </>
                            ) : (
                                <>
                                    <span>Save Profile & Proceed to Dashboard</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <footer className="mt-12 text-center text-xs text-slate-500">
                Virtue Management Systems &bull; Secure Encrypted Profile Verification
            </footer>
        </div>
    );
}
