"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit3, CheckCircle, Truck, Loader2, Sparkles, X } from "lucide-react";

type Supplier = {
  id: string;
  supplier_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  bank_details: {
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    branch_name?: string;
  } | null;
  status: string;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form Fields
  const [supplierName, setSupplierName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  
  // Bank Details Fields
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [status, setStatus] = useState("Active");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/suppliers");
      const data = await res.json();
      if (res.ok) setSuppliers(data.suppliers || []);
    } catch {
      setError("Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenModal(supplier: Supplier | null = null) {
    setError("");
    setSuccess("");
    if (supplier) {
      // Edit mode
      setSelectedSupplier(supplier);
      setSupplierName(supplier.supplier_name);
      setContactPerson(supplier.contact_person || "");
      setPhone(supplier.phone || "");
      setEmail(supplier.email || "");
      setAddress(supplier.address || "");
      setStatus(supplier.status);
      
      const bank = supplier.bank_details || {};
      setBankName(bank.bank_name || "");
      setAccountNumber(bank.account_number || "");
      setIfscCode(bank.ifsc_code || "");
      setBranchName(bank.branch_name || "");
    } else {
      // Create mode
      setSelectedSupplier(null);
      setSupplierName("");
      setContactPerson("");
      setPhone("");
      setEmail("");
      setAddress("");
      setStatus("Active");
      setBankName("");
      setAccountNumber("");
      setIfscCode("");
      setBranchName("");
    }
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        id: selectedSupplier?.id || undefined,
        supplier_name: supplierName.trim(),
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        status,
        bank_details: (bankName || accountNumber) ? {
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          ifsc_code: ifscCode.trim(),
          branch_name: branchName.trim()
        } : null
      };

      const res = await fetch("/api/inventory/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save supplier.");

      setSuccess(selectedSupplier ? "Supplier updated successfully!" : "New Supplier created successfully!");
      setIsOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // Client filtering
  const filteredSuppliers = suppliers.filter(sup => {
    const matchesSearch =
      searchQuery === "" ||
      sup.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sup.contact_person && sup.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sup.phone && sup.phone.includes(searchQuery));

    return matchesSearch;
  });

  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Suppliers Directory</h2>
          <p className="text-slate-500 text-xs mt-1">Manage bookstore vendors, publishers, and payment account parameters</p>
        </div>
        <button
          onClick={() => handleOpenModal(null)}
          className="bg-[#4DA8DA] hover:bg-[#3c97c9] text-white font-bold text-xs px-5 py-3 rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-[#4DA8DA]/10"
        >
          <Plus className="w-4 h-4" /> Add New Vendor
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:bg-white border border-slate-200 focus:border-[#4DA8DA] transition-all"
            placeholder="Search by vendor name, contact person, or phone number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" /> {success}
        </div>
      )}

      {/* Suppliers Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Loader2 className="w-8 h-8 text-[#4DA8DA] animate-spin" />
          <span className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Loading Vendors...</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4">Vendor Name</th>
                  <th className="px-6 py-4">Contact Person</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Bank Integration</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">No suppliers registered in directory</td>
                  </tr>
                ) : (
                  filteredSuppliers.map(sup => (
                    <tr key={sup.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{sup.supplier_name}</td>
                      <td className="px-6 py-4 font-semibold text-slate-600">{sup.contact_person || "—"}</td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-700">{sup.phone || "—"}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{sup.email || "—"}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-[10px]">
                        {sup.bank_details ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-600">{sup.bank_details.bank_name}</span>
                            <span>A/c: {sup.bank_details.account_number}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">Not Configured</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          sup.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {sup.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenModal(sup)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#4DA8DA] transition-colors"
                          title="Edit Vendor Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredSuppliers.length > 0 && (
            <div className="px-6 py-3 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-200">
              Showing {filteredSuppliers.length} of {suppliers.length} vendors
            </div>
          )}
        </div>
      )}

      {/* CRUD Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {selectedSupplier ? "Edit Vendor Profile" : "Register New Vendor"}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Supplier Directory Configuration
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 animate-shake">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Vendor Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Oxford University Press"
                    value={supplierName}
                    onChange={e => setSupplierName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Contact Person</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Ramesh Kumar"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input
                    type="tel"
                    className={inputClass}
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input
                    type="email"
                    className={inputClass}
                    placeholder="e.g. contact@vendor.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Supplier Address</label>
                <textarea
                  className={`${inputClass} h-16`}
                  placeholder="Enter vendor's full billing/shipping address..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>

              {/* Bank accounts setup */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF9933]" /> Bank Details (Purchase Orders & Payments)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Bank Name</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. HDFC Bank"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Account Number</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. 5010023456789"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>IFSC Code</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. HDFC0001234"
                      value={ifscCode}
                      onChange={e => setIfscCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Branch Name</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. Somajiguda Branch"
                      value={branchName}
                      onChange={e => setBranchName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl text-xs font-bold transition-all"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#4DA8DA] hover:bg-[#3c97c9] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-[#4DA8DA]/10"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Vendor Details"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
