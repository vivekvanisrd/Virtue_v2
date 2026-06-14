"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  ShieldCheck, 
  Key, 
  Lock, 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  Globe,
  Zap,
  Activity,
  CreditCard,
  QrCode,
  Upload
} from "lucide-react";
import { 
  saveAxisConfigAction, 
  testAxisConnectionAction,
  saveBranchGatewayConfigAction,
  getBranchGatewayConfigAction
} from "@/lib/actions/banking-actions";
import { cn } from "@/lib/utils";

interface BankSettingsProps {
  schoolId: string;
}

export function BankSettings({ schoolId }: BankSettingsProps) {
  const [activeTab, setActiveTab] = useState<"axis" | "gateways">("gateways");
  
  // Axis States
  const [showSecrets, setShowSecrets] = useState(false);
  const [isSavingAxis, setIsSavingAxis] = useState(false);
  const [isTestingAxis, setIsTestingAxis] = useState(false);
  const [axisStatus, setAxisStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [axisData, setAxisData] = useState({
    clientId: "",
    clientSecret: "",
    publicKey: "",
    accountNumber: "",
    corporateId: ""
  });

  // Gateway States
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [activeProvider, setActiveProvider] = useState<string>("NONE");
  const [gatewayConfig, setGatewayConfig] = useState<Record<string, string>>({
    upiVpa: "",
    upiMerchantName: "",
    keyId: "",
    keySecret: "",
    webhookSecret: "",
    clientId: "",
    clientSecret: "",
    merchantId: "",
    saltKey: "",
    saltIndex: "1",
    website: ""
  });
  const [isSavingGateway, setIsSavingGateway] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showGatewaySecrets, setShowGatewaySecrets] = useState(false);

  // Load reference branches on mount
  useEffect(() => {
    async function loadBranches() {
      try {
        const { getAdmissionReferenceData } = await import("@/lib/actions/reference-actions");
        const res = await getAdmissionReferenceData();
        if (res.success && res.data?.branches) {
          setBranches(res.data.branches);
          if (res.data.branches.length > 0) {
            setSelectedBranchId(res.data.branches[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load branches in bank settings:", err);
      }
    }
    loadBranches();
  }, []);

  // Fetch gateway settings when branch changes
  useEffect(() => {
    if (!selectedBranchId) return;
    async function fetchGatewayConfig() {
      const res = await getBranchGatewayConfigAction(selectedBranchId);
      if (res.success) {
        setActiveProvider(res.provider || "NONE");
        setGatewayConfig({
          upiVpa: res.config?.upiVpa || "",
          upiMerchantName: res.config?.upiMerchantName || "",
          keyId: res.config?.keyId || "",
          keySecret: res.config?.keySecret || "",
          webhookSecret: res.config?.webhookSecret || "",
          clientId: res.config?.clientId || "",
          clientSecret: res.config?.clientSecret || "",
          merchantId: res.config?.merchantId || "",
          saltKey: res.config?.saltKey || "",
          saltIndex: res.config?.saltIndex || "1",
          website: res.config?.website || ""
        });
      }
    }
    fetchGatewayConfig();
  }, [selectedBranchId]);

  // Handle Axis Settings Submit
  const handleSaveAxis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAxis(true);
    const result = await saveAxisConfigAction({ ...axisData, schoolId });
    setAxisStatus(result);
    setIsSavingAxis(false);
    setTimeout(() => setAxisStatus(null), 5000);
  };

  // Handle Axis Connection Test
  const handleTestAxisConnection = async () => {
    setIsTestingAxis(true);
    const result = await testAxisConnectionAction(schoolId);
    setAxisStatus(result);
    setIsTestingAxis(false);
  };

  // Handle Gateway Settings Submit
  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGateway(true);
    setGatewayStatus(null);
    
    // Filter configuration based on current provider to save space
    const filteredConfig: Record<string, string> = {};
    if (activeProvider === "UPI_QR") {
      filteredConfig.upiVpa = gatewayConfig.upiVpa;
      filteredConfig.upiMerchantName = gatewayConfig.upiMerchantName;
    } else if (activeProvider === "Razorpay") {
      filteredConfig.keyId = gatewayConfig.keyId;
      filteredConfig.keySecret = gatewayConfig.keySecret;
      filteredConfig.webhookSecret = gatewayConfig.webhookSecret;
    } else if (activeProvider === "PhonePe") {
      filteredConfig.merchantId = gatewayConfig.merchantId;
      filteredConfig.saltKey = gatewayConfig.saltKey;
      filteredConfig.saltIndex = gatewayConfig.saltIndex;
    } else if (activeProvider === "Cashfree") {
      filteredConfig.clientId = gatewayConfig.clientId;
      filteredConfig.clientSecret = gatewayConfig.clientSecret;
    } else if (activeProvider === "Paytm") {
      filteredConfig.merchantId = gatewayConfig.merchantId;
      filteredConfig.clientSecret = gatewayConfig.clientSecret;
      filteredConfig.website = gatewayConfig.website;
    }

    const result = await saveBranchGatewayConfigAction({
      branchId: selectedBranchId,
      provider: activeProvider,
      config: filteredConfig
    });

    setGatewayStatus(result);
    setIsSavingGateway(false);
    setTimeout(() => setGatewayStatus(null), 5000);
  };

  // UPI QR Scanner upload parser (extracts VPA and Merchant name from scanned QR code)
  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGatewayStatus({ success: true, message: "Parsing QR code image..." });

    try {
      // Dynamic import to prevent SSR errors
      const { Html5Qrcode } = await import("html5-qrcode");

      // We need a hidden container element to initialize Html5Qrcode.
      let hiddenContainer = document.getElementById("qr-reader-hidden");
      if (!hiddenContainer) {
        hiddenContainer = document.createElement("div");
        hiddenContainer.id = "qr-reader-hidden";
        hiddenContainer.style.display = "none";
        document.body.appendChild(hiddenContainer);
      }

      const html5Qrcode = new Html5Qrcode("qr-reader-hidden");
      
      try {
        const decodedText = await html5Qrcode.scanFile(file, false);
        
        // Clear the instance scanner
        await html5Qrcode.clear();

        if (decodedText.startsWith("upi://pay?")) {
          const query = decodedText.substring("upi://pay?".length);
          const params = new URLSearchParams(query);
          const pa = params.get("pa") || "";
          const pn = params.get("pn") || "";
          
          if (pa) {
            setGatewayConfig(prev => ({
              ...prev,
              upiVpa: pa,
              upiMerchantName: pn || prev.upiMerchantName || branches.find(b => b.id === selectedBranchId)?.name || "Virtue School Branch"
            }));
            setGatewayStatus({ success: true, message: "Auto-detected UPI details from QR code!" });
          } else {
            setGatewayStatus({ success: false, message: "QR code scanned, but no VPA address (pa) was found." });
          }
        } else {
          // If it's a generic text/URL, try to extract a VPA
          const matches = decodedText.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-_]+/);
          if (matches && matches[0]) {
            setGatewayConfig(prev => ({
              ...prev,
              upiVpa: matches[0],
              upiMerchantName: prev.upiMerchantName || branches.find(b => b.id === selectedBranchId)?.name || "Virtue School Branch"
            }));
            setGatewayStatus({ success: true, message: `Auto-detected VPA from QR: ${matches[0]}` });
          } else {
            setGatewayStatus({ 
              success: false, 
              message: "Scanned QR code but couldn't identify a UPI link. Content: " + decodedText.substring(0, 50) 
            });
          }
        }
      } catch (scanErr) {
        // Try to clear scanner if scanning fails
        try { await html5Qrcode.clear(); } catch {}
        throw scanErr;
      }
    } catch (err: any) {
      console.error("QR Code parsing failed:", err);
      setGatewayStatus({ 
        success: false, 
        message: "Failed to read QR code. Please ensure it's a clear UPI QR code image." 
      });
    }
    setTimeout(() => setGatewayStatus(null), 5000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl pb-20">
      
      {/* ─── TAB NAVIGATION ─── */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 max-w-md">
        <button
          onClick={() => setActiveTab("gateways")}
          className={cn(
            "flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2",
            activeTab === "gateways" ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <CreditCard className="w-4 h-4" />
          Branch Gateways
        </button>
        <button
          onClick={() => setActiveTab("axis")}
          className={cn(
            "flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2",
            activeTab === "axis" ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Building2 className="w-4 h-4" />
          Axis Neo Banking
        </button>
      </div>

      {/* ─── TAB 1: BANKING CONFIGURATION (Axis Neo) ─── */}
      {activeTab === "axis" && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-border shadow-xl shadow-slate-100/50">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl rotate-3">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Axis Neo Configuration</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-1 flex items-center gap-2">
                  <Zap className="w-3 h-3 fill-primary" /> Connected Banking v2.0
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleTestAxisConnection}
                disabled={isTestingAxis}
                className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2 hover:bg-emerald-100 transition-all disabled:opacity-50"
              >
                {isTestingAxis ? <Activity className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                {isTestingAxis ? "Handshaking..." : "Check Connection"}
              </button>
              <a 
                href="https://developer.axisbank.co.in/" 
                target="_blank" 
                rel="noreferrer"
                className="p-3 bg-slate-50 text-slate-400 hover:text-primary rounded-xl transition-all border border-border"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>

          {axisStatus && (
            <div className={cn(
              "p-4 rounded-2xl border flex items-center gap-3 animate-in zoom-in-95 duration-300",
              axisStatus.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
            )}>
              {axisStatus.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <span className="text-sm font-bold">{axisStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSaveAxis} className="bg-white rounded-[2.5rem] border border-border overflow-hidden shadow-sm">
                <div className="p-8 border-b border-border bg-slate-50/50">
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-3">
                    <Lock className="w-5 h-5 text-slate-400" />
                    API Credentials
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">These keys authorize PaVa-EDUX to perform payouts and verify receipts.</p>
                </div>

                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Client ID</label>
                      <input 
                        type="text" 
                        value={axisData.clientId}
                        onChange={e => setAxisData({ ...axisData, clientId: e.target.value })}
                        placeholder="AXIS_CLIENT_XXXX"
                        required
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Client Secret</label>
                      <div className="relative group">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type={showSecrets ? "text" : "password"} 
                          value={axisData.clientSecret}
                          onChange={e => setAxisData({ ...axisData, clientSecret: e.target.value })}
                          placeholder="••••••••••••••••"
                          required
                          className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowSecrets(!showSecrets)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg"
                        >
                          {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Universal Encryption Key (RSA Public)</label>
                    <textarea 
                      rows={4}
                      value={axisData.publicKey}
                      onChange={e => setAxisData({ ...axisData, publicKey: e.target.value })}
                      placeholder="-----BEGIN PUBLIC KEY-----"
                      required
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-mono focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Corporate Account Number</label>
                      <input 
                        type="text" 
                        value={axisData.accountNumber}
                        onChange={e => setAxisData({ ...axisData, accountNumber: e.target.value })}
                        placeholder="9120XXXXXXXXXXX"
                        required
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Corporate ID</label>
                      <input 
                        type="text" 
                        value={axisData.corporateId}
                        onChange={e => setAxisData({ ...axisData, corporateId: e.target.value })}
                        placeholder="CORP001"
                        required
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-slate-50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Region: India (Axis Connect)
                  </span>
                  <button 
                    type="submit"
                    disabled={isSavingAxis}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl disabled:opacity-50 hover:scale-105 active:scale-95"
                  >
                    <Save className="w-5 h-5" />
                    {isSavingAxis ? "Saving..." : "Store Credentials"}
                  </button>
                </div>
              </form>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-border p-8 shadow-sm">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Axis Status</h4>
                <div className="space-y-4 text-xs font-bold text-slate-500">
                  <div className="flex justify-between"><span>Sandbox Environment</span><span className="text-emerald-600">Active</span></div>
                  <div className="flex justify-between"><span>Maker-Checker Setup</span><span className="text-slate-700">Enforced</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: BRANCH PAYMENT GATEWAYS (Razorpay, PhonePe, Cashfree, Paytm, UPI) ─── */}
      {activeTab === "gateways" && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-border shadow-xl shadow-slate-100/50">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl rotate-3">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Branch Gateway Hub</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-1">Configure active checkout paths for individual branches</p>
              </div>
            </div>

            {/* Branch Selector */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2">Branch:</span>
              <select
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {gatewayStatus && (
            <div className={cn(
              "p-4 rounded-2xl border flex items-center gap-3 animate-in zoom-in-95 duration-300",
              gatewayStatus.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
            )}>
              {gatewayStatus.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <span className="text-sm font-bold">{gatewayStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <form onSubmit={handleSaveGateway} className="bg-white rounded-[2.5rem] border border-border overflow-hidden shadow-sm">
                
                {/* Gateway Provider Selection */}
                <div className="p-8 border-b border-border bg-slate-50/50">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Active Gateway Provider</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { id: "NONE", label: "Disable Online" },
                      { id: "UPI_QR", label: "Custom UPI QR" },
                      { id: "Razorpay", label: "Razorpay API" },
                      { id: "PhonePe", label: "PhonePe PG" },
                      { id: "Cashfree", label: "Cashfree PG" }
                    ].map(prov => (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => setActiveProvider(prov.id)}
                        className={cn(
                          "py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 text-center",
                          activeProvider === prov.id 
                            ? "bg-slate-900 border-slate-900 text-white shadow-md"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                        )}
                      >
                        {prov.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form fields based on selected provider */}
                <div className="p-8 space-y-6">
                  
                  {activeProvider === "NONE" && (
                    <div className="py-10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-black text-slate-700">Online Payments Disabled</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">Parents opening billing links will not be given self-pay portals. Cashiers must collect payments manually.</p>
                    </div>
                  )}

                  {/* UPI QR Config */}
                  {activeProvider === "UPI_QR" && (
                    <div className="space-y-6">
                      <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex items-start gap-4">
                        <QrCode className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-black uppercase text-indigo-950">Parent-Facing Custom UPI QR</h4>
                          <p className="text-xs text-indigo-800/80 font-medium leading-relaxed mt-1">
                            Parents scan your uploaded QR code and enter their 12-digit UTR. Uploading a QR code image will automatically populate your VPA and Merchant Name below.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-2 border-dashed border-slate-200 p-6 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer relative group">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleQRUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div className="flex items-center gap-3">
                            <Upload className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                            <span className="text-xs font-bold text-slate-600">Upload QR Code image to auto-detect VPA</span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200">Browse</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">UPI Address (VPA) *</label>
                            <input 
                              type="text" 
                              value={gatewayConfig.upiVpa}
                              onChange={e => setGatewayConfig({ ...gatewayConfig, upiVpa: e.target.value })}
                              placeholder="e.g. virtueacademy@okaxis"
                              required
                              className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Merchant Payee Name *</label>
                            <input 
                              type="text" 
                              value={gatewayConfig.upiMerchantName}
                              onChange={e => setGatewayConfig({ ...gatewayConfig, upiMerchantName: e.target.value })}
                              placeholder="e.g. Virtue Academy HSR"
                              required
                              className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Razorpay Config */}
                  {activeProvider === "Razorpay" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Key ID *</label>
                          <input 
                            type="text" 
                            value={gatewayConfig.keyId}
                            onChange={e => setGatewayConfig({ ...gatewayConfig, keyId: e.target.value })}
                            placeholder="rzp_live_XXXXXXXXX"
                            required
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Key Secret *</label>
                          <div className="relative group">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                              type={showGatewaySecrets ? "text" : "password"} 
                              value={gatewayConfig.keySecret}
                              onChange={e => setGatewayConfig({ ...gatewayConfig, keySecret: e.target.value })}
                              placeholder="••••••••••••••••"
                              required
                              className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                            />
                            <button 
                              type="button"
                              onClick={() => setShowGatewaySecrets(!showGatewaySecrets)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg"
                            >
                              {showGatewaySecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Webhook Secret (Optional)</label>
                        <input 
                          type="password" 
                          value={gatewayConfig.webhookSecret}
                          onChange={e => setGatewayConfig({ ...gatewayConfig, webhookSecret: e.target.value })}
                          placeholder="Webhook verification secret"
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* PhonePe Config */}
                  {activeProvider === "PhonePe" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Merchant ID *</label>
                          <input 
                            type="text" 
                            value={gatewayConfig.merchantId}
                            onChange={e => setGatewayConfig({ ...gatewayConfig, merchantId: e.target.value })}
                            placeholder="M22XXXXXXXXXXXXXXXXX"
                            required
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Salt Key *</label>
                          <input 
                            type="password" 
                            value={gatewayConfig.saltKey}
                            onChange={e => setGatewayConfig({ ...gatewayConfig, saltKey: e.target.value })}
                            placeholder="Your PhonePe salt key"
                            required
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Salt Index (Normally 1) *</label>
                        <input 
                          type="text" 
                          value={gatewayConfig.saltIndex}
                          onChange={e => setGatewayConfig({ ...gatewayConfig, saltIndex: e.target.value })}
                          placeholder="1"
                          required
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Cashfree Config */}
                  {activeProvider === "Cashfree" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Client App ID *</label>
                          <input 
                            type="text" 
                            value={gatewayConfig.clientId}
                            onChange={e => setGatewayConfig({ ...gatewayConfig, clientId: e.target.value })}
                            placeholder="CFXXXXXXXXXXXX"
                            required
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Client Secret *</label>
                          <input 
                            type="password" 
                            value={gatewayConfig.clientSecret}
                            onChange={e => setGatewayConfig({ ...gatewayConfig, clientSecret: e.target.value })}
                            placeholder="Your Cashfree API secret key"
                            required
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Submit Panel */}
                <div className="p-8 bg-slate-50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Endpoint: Secured Branch API Tunnel
                  </span>
                  {activeProvider !== "NONE" && (
                    <button 
                      type="submit"
                      disabled={isSavingGateway}
                      className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl disabled:opacity-50 hover:scale-105 active:scale-95"
                    >
                      <Save className="w-5 h-5" />
                      {isSavingGateway ? "Saving Config..." : "Activate Gateway"}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right Information Panel */}
            <div className="space-y-6">
              <div className="bg-amber-50 rounded-[2.5rem] border border-amber-200 p-8">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-800 mb-4">Merchant Guidelines</h4>
                <ul className="space-y-4 text-xs font-bold text-amber-900/60 leading-relaxed">
                  <li className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    Secrets are encrypted using AES-256 with a unique deployment key.
                  </li>
                  <li className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    Personal UPI VPAs are subject to bank limits of ₹1,00,000 per day.
                  </li>
                  <li className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    For auto-reconciliation, ensure you enter webhooks in the gateway dashboard.
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-border p-8 shadow-sm">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Integration Guide</h4>
                <div className="space-y-4 text-xs font-bold text-slate-500">
                  <div className="flex justify-between"><span>Active Branch</span><span className="text-slate-700 uppercase font-mono">{selectedBranchId}</span></div>
                  <div className="flex justify-between"><span>Reconciliation Type</span><span>{activeProvider === "UPI_QR" ? "UTR Matching" : (activeProvider === "NONE" ? "Manual Only" : "Webhook Auto")}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
