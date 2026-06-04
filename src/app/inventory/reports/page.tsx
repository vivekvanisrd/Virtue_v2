"use client";

import { useState, useEffect } from "react";
import {
  FileSpreadsheet, Printer, Search, Loader2, Sparkles, Filter,
  Truck, Check, DollarSign, Layers, CheckCircle,
  TrendingUp, Award, BookMarked, ClipboardCheck, ShieldAlert, BookOpen as BookIcon,
  ShoppingCart, UserCheck, AlertCircle
} from "lucide-react";
import * as XLSX from "xlsx";

type AcademicYear = {
  id: string;
  name: string;
  isCurrent: boolean;
};

type Supplier = {
  id: string;
  supplier_name: string;
};

type Item = {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  item_type?: string | null;
  unit?: string;
  reorder_level?: number;
  status?: string;
};

type Kit = {
  id: string;
  kit_name: string;
  description: string | null;
  total_price: number;
  status: string;
  inventory_kit_items: Array<{
    id: string;
    item_id: string;
    quantity: number;
    inventory_items: Item;
  }>;
};

type Student = {
  id: string;
  name: string;
  admissionNo: string;
  classId: string;
  sectionId: string;
  className?: string;
  sectionName?: string;
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Report Settings
  const [reportType, setReportType] = useState<
    "dashboard" | "stock" | "procurement" | "sales" | "kits" | "class" | "student" | "subject" | "reorder"
  >("dashboard");
  
  // Data lists
  const [stockData, setStockData] = useState<any[]>([]);
  const [procurementData, setProcurementData] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [studentMap, setStudentMap] = useState<Record<string, string>>({});
  const [classMap, setClassMap] = useState<Record<string, string>>({});

  // Filter Values
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSupplierId, setSelectedSupplierId] = useState("All");
  const [selectedItemId, setSelectedItemId] = useState("All");
  
  // Particular Kit Report State
  const [selectedKitId, setSelectedKitId] = useState<string>("All");
  
  // Student Ledger State
  const [studentSearch, setStudentSearch] = useState("");
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentLedger, setStudentLedger] = useState<any | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Dynamic pricing maps (out-of-box valuation helper)
  const [lastKnownSellPrices, setLastKnownSellPrices] = useState<Record<string, number>>({});
  const [lastKnownBuyPrices, setLastKnownBuyPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (academicYearId) {
      loadAllData();
    }
  }, [academicYearId]);

  // Debounced Student search
  useEffect(() => {
    if (!studentSearch || studentSearch.length < 2) {
      setStudentsList([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const res = await fetch(`/api/inventory/metadata?students=true&q=${encodeURIComponent(studentSearch)}`);
        const data = await res.json();
        if (res.ok) {
          setStudentsList(data.students || []);
        }
      } catch (err) {
        console.error("Student search failed:", err);
      } finally {
        setSearchingStudents(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [studentSearch]);

  // Load student ledger when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      loadStudentLedger(selectedStudent.id);
    } else {
      setStudentLedger(null);
    }
  }, [selectedStudent, academicYearId]);

  async function fetchMetadata() {
    try {
      const supRes = await fetch("/api/inventory/suppliers");
      const supData = await supRes.json();
      if (supRes.ok) setSuppliers(supData.suppliers || []);

      const itmRes = await fetch("/api/inventory/items");
      const itmData = await itmRes.json();
      if (itmRes.ok) setItems(itmData.items || []);

      const metaRes = await fetch("/api/inventory/metadata");
      const metaData = await metaRes.json();
      if (metaRes.ok) {
        setAcademicYears(metaData.academicYears || []);
        setClasses(metaData.classes || []);
        const current = metaData.academicYears?.find((ay: any) => ay.isCurrent);
        if (current) setAcademicYearId(current.id);
        else if (metaData.academicYears?.length > 0) setAcademicYearId(metaData.academicYears[0].id);
      }
    } catch {
      setError("Failed to load filter metadata.");
    }
  }

  async function loadAllData() {
    if (!academicYearId) return;
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Live Stock
      const stockRes = await fetch(`/api/inventory/stock?academic_year_id=${academicYearId}`);
      const stockVal = await stockRes.json();
      const rawStock = stockVal.stock || [];
      setStockData(rawStock);

      // 2. Fetch Procurement
      const procRes = await fetch(`/api/inventory/goods-receipts?academic_year_id=${academicYearId}`);
      const procVal = await procRes.json();
      const flattenedProc: any[] = [];
      const buyPrices: Record<string, number> = {};
      (procVal.grns || []).forEach((grn: any) => {
        grn.inventory_grn_items.forEach((gi: any) => {
          const rateVal = Number(gi.rate || 0);
          buyPrices[gi.item_id] = rateVal;
          flattenedProc.push({
            grn_number: grn.grn_number,
            invoice_number: grn.invoice_number,
            receipt_date: grn.receipt_date,
            supplier_name: grn.inventory_suppliers?.supplier_name || "Unknown Supplier",
            supplier_id: grn.supplier_id,
            item_id: gi.item_id,
            item_code: gi.inventory_items?.item_code || "",
            item_name: gi.inventory_items?.item_name || "",
            category: gi.inventory_items?.category || "",
            quantity: gi.quantity_received,
            rate: rateVal,
            amount: Number(gi.amount || 0),
          });
        });
      });
      setProcurementData(flattenedProc);
      setLastKnownBuyPrices(buyPrices);

      // 3. Fetch Sales
      const salesRes = await fetch(`/api/inventory/reports/data?type=sales&academic_year_id=${academicYearId}`);
      const salesVal = await salesRes.json();
      if (salesVal.studentMap) setStudentMap(salesVal.studentMap);
      if (salesVal.classMap) setClassMap(salesVal.classMap);

      const combinedSales: any[] = [];
      const sellPrices: Record<string, number> = {};
      
      // A. Online paid checkouts
      (salesVal.paidCheckouts || []).forEach((pc: any) => {
        combinedSales.push({
          id: pc.id,
          date: pc.paid_at || pc.created_at,
          type: "Online Checkout",
          reference: pc.token.slice(0, 8),
          customer: `${pc.student_name} (Parent: ${pc.parent_name || ""})`,
          phone: pc.phone,
          item_code: "Kit Order",
          item_name: pc.description || "Class Kit Bundle",
          category: "Kits",
          quantity: 1,
          rate: Number(pc.amount || 0),
          amount: Number(pc.amount || 0),
          remarks: pc.payment_method || "Paid Online"
        });
      });
      // B. Manual stock issues
      (salesVal.issues || []).forEach((iss: any) => {
        iss.inventory_issue_items.forEach((ii: any) => {
          const sName = iss.student_id ? salesVal.studentMap?.[iss.student_id] : null;
          const cName = iss.class_id ? salesVal.classMap?.[iss.class_id] : null;
          const uPrice = Number(ii.unit_price || 0);
          sellPrices[ii.item_id] = uPrice;
          combinedSales.push({
            id: iss.id,
            item_id: ii.item_id,
            date: iss.issue_date,
            type: iss.is_credit_issue ? "Credit Distribution" : "Direct Distribution",
            reference: iss.id.slice(0, 8),
            customer: sName ? `${sName} (${iss.student_id.slice(0, 6)})` : cName ? `Class: ${cName}` : "Class / Section",
            class_id: iss.class_id,
            student_id: iss.student_id,
            phone: "—",
            item_code: ii.inventory_items?.item_code || "",
            item_name: ii.inventory_items?.item_name || "",
            category: ii.inventory_items?.category || "",
            quantity: ii.quantity,
            rate: uPrice,
            amount: uPrice * ii.quantity,
            remarks: iss.remarks || ""
          });
        });
      });
      setSalesData(combinedSales);
      setLastKnownSellPrices(sellPrices);

      // 4. Fetch Catalog Items & Kits
      const catRes = await fetch(`/api/inventory/reports/data?type=catalog&academic_year_id=${academicYearId}`);
      const catVal = await catRes.json();
      setKits(catVal.kits || []);
      
    } catch (err: any) {
      setError(err.message || "An error occurred while loading bookstore reports.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentLedger(studentId: string) {
    setLoadingLedger(true);
    setError("");
    try {
      const res = await fetch(`/api/inventory/reports/data?type=student&student_id=${studentId}&academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (res.ok) {
        setStudentLedger(data);
      } else {
        throw new Error(data.error || "Failed to load student ledger");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingLedger(false);
    }
  }

  // Helper formatting: Convert class Roman numerals to Numerics, e.g. Class I -> 1st Class
  function normalizeClassName(name: string): string {
    if (!name) return "";
    let normalized = name.trim().toUpperCase();
    
    // Replace Roman numerals strictly (from longest to shortest)
    const romans = [
      { r: /\bVIII\b/g, n: "8th" },
      { r: /\bVII\b/g, n: "7th" },
      { r: /\bIII\b/g, n: "3rd" },
      { r: /\bLKG\b/g, n: "LKG" },
      { r: /\bUKG\b/g, n: "UKG" },
      { r: /\bNUR\b/g, n: "Nursery" },
      { r: /\bIX\b/g, n: "9th" },
      { r: /\bVI\b/g, n: "6th" },
      { r: /\bIV\b/g, n: "4th" },
      { r: /\bV\b/g, n: "5th" },
      { r: /\bII\b/g, n: "2nd" },
      { r: /\bI\b/g, n: "1st" },
      { r: /\bX\b/g, n: "10th" }
    ];
    romans.forEach(({ r, n }) => {
      normalized = normalized.replace(r, n);
    });

    if (normalized.includes("NURSERY")) return "Nursery";
    if (normalized.includes("LKG") || normalized.includes("L.K.G")) return "LKG";
    if (normalized.includes("UKG") || normalized.includes("U.K.G")) return "UKG";
    if (normalized.includes("DAY") && normalized.includes("CARE")) return "Day Care";
    if (normalized.includes("PLAY") && normalized.includes("GROUP")) return "Play Group";
    
    // Standardize Grade / Class string
    normalized = normalized.replace(/CLASS|GRADE|SECTION|SEC/g, "").trim();
    
    const match = normalized.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      let suffix = "th";
      if (num === 1) suffix = "st";
      else if (num === 2) suffix = "nd";
      else if (num === 3) suffix = "rd";
      return `${num}${suffix} Class`;
    }
    
    // Titlecase word boundary matching
    return name.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  // Helper matching: Assign textbooks and notebooks to subjects dynamically
  function getSubjectFromItem(itemName: string, itemCode: string): string {
    const str = `${itemName} ${itemCode}`.toUpperCase();
    if (str.includes("TELUGU") || str.includes("TEL")) return "Telugu";
    if (str.includes("HINDI") || str.includes("HIN")) return "Hindi";
    if (str.includes("ENGLISH") || str.includes("ENG")) return "English";
    if (str.includes("MATH") || str.includes("MATHEMATICS") || str.includes("MAT") || str.includes("ARITHMETIC")) return "Mathematics";
    if (str.includes("SCIENCE") || str.includes("SCI") || str.includes("EVS") || str.includes("BIOLOGY") || str.includes("PHYSICS") || str.includes("CHEMISTRY") || str.includes("ENVIRONMENTAL")) return "Science / EVS";
    if (str.includes("SOCIAL") || str.includes("SOC") || str.includes("HISTORY") || str.includes("GEOGRAPHY") || str.includes("CIVICS")) return "Social Studies";
    if (str.includes("ABACUS") || str.includes("ABA")) return "Abacus";
    if (str.includes("COMPUTER") || str.includes("COMP") || str.includes("IT")) return "Computers";
    if (str.includes("GK") || str.includes("G.K") || str.includes("GENERAL KNOWLEDGE")) return "General Knowledge";
    if (str.includes("DRAWING") || str.includes("ART") || str.includes("SCRIBBLING") || str.includes("COLOURING") || str.includes("COLORING")) return "Drawing & Art";
    if (str.includes("NOTEBOOK") || str.includes("NOTE BOOK") || str.includes("RULED") || str.includes("BROAD") || str.includes("SQUARE")) return "General Notebooks";
    return "General / Others";
  }

  // Dynamic client-side filtration depending on tab
  const getFilteredData = () => {
    let baseData: any[] = [];
    
    if (reportType === "stock") {
      baseData = stockData;
    } else if (reportType === "procurement") {
      baseData = procurementData;
    } else if (reportType === "sales") {
      baseData = salesData;
    } else if (reportType === "reorder") {
      baseData = stockData.filter((r: any) => r.current_stock <= r.reorder_level);
    } else {
      return [];
    }

    return baseData.filter((row: any) => {
      // 1. Category Filter
      if (selectedCategory !== "All" && row.category !== selectedCategory) return false;

      // 2. SKU Filter
      if (selectedItemId !== "All") {
        if (reportType === "stock" && row.id !== selectedItemId) return false;
        if (reportType === "procurement" && row.item_id !== selectedItemId) return false;
        if (reportType === "sales" && row.item_id !== selectedItemId) return false;
        if (reportType === "reorder" && row.id !== selectedItemId) return false;
      }

      // 3. Date Filters
      if (reportType !== "stock" && reportType !== "reorder") {
        const dateVal = new Date(row.receipt_date || row.issue_date || row.date);
        if (startDate && dateVal < new Date(startDate)) return false;
        if (endDate && dateVal > new Date(endDate + "T23:59:59")) return false;
      }

      // 4. Supplier Filter
      if (reportType === "procurement" && selectedSupplierId !== "All" && row.supplier_id !== selectedSupplierId) return false;

      return true;
    });
  };

  const filteredData = getFilteredData();

  // Dynamic computations for Class-wise summaries
  const computeClassSummaries = () => {
    const summaries: Record<string, {
      className: string;
      kitCount: number;
      looseItemCount: number;
      totalValue: number;
      creditValue: number;
      onlinePaid: number;
      transactions: any[];
    }> = {};

    // Seed academic classes
    classes.forEach((c: any) => {
      const name = normalizeClassName(c.name);
      summaries[c.id] = {
        className: name,
        kitCount: 0,
        looseItemCount: 0,
        totalValue: 0,
        creditValue: 0,
        onlinePaid: 0,
        transactions: []
      };
    });

    const UNASSIGNED_KEY = "unassigned";
    summaries[UNASSIGNED_KEY] = {
      className: "General Bookstore Sales",
      kitCount: 0,
      looseItemCount: 0,
      totalValue: 0,
      creditValue: 0,
      onlinePaid: 0,
      transactions: []
    };

    salesData.forEach((row: any) => {
      let classId = row.class_id || UNASSIGNED_KEY;
      
      if (!row.class_id && row.student_id) {
        const desc = (row.item_name || "").toUpperCase();
        const matchedClass = classes.find((c: any) => {
          const normalizedKitName = c.name.toUpperCase().replace(/CLASS|GRADE/g, "").trim();
          return desc.includes(normalizedKitName);
        });
        if (matchedClass) {
          classId = matchedClass.id;
        }
      }

      if (classId === UNASSIGNED_KEY && row.category === "Kits") {
        const desc = (row.item_name || "").toUpperCase();
        const matchedClass = classes.find((c: any) => {
          const normalizedKitName = c.name.toUpperCase().replace(/CLASS|GRADE/g, "").trim();
          return desc.includes(normalizedKitName);
        });
        if (matchedClass) {
          classId = matchedClass.id;
        }
      }

      if (!summaries[classId]) {
        summaries[classId] = {
          className: row.class_id ? normalizeClassName(classMap[row.class_id]) : "General Bookstore Sales",
          kitCount: 0,
          looseItemCount: 0,
          totalValue: 0,
          creditValue: 0,
          onlinePaid: 0,
          transactions: []
        };
      }

      const summary = summaries[classId];
      summary.transactions.push(row);
      
      if (row.category === "Kits" || (row.item_code || "").startsWith("KIT-")) {
        summary.kitCount += row.quantity;
      } else {
        summary.looseItemCount += row.quantity;
      }

      summary.totalValue += row.amount;
      if (row.type === "Credit Distribution") {
        summary.creditValue += row.amount;
      } else if (row.type === "Online Checkout") {
        summary.onlinePaid += row.amount;
      }
    });

    return Object.entries(summaries)
      .map(([id, val]) => ({ id, ...val }))
      .filter(val => val.id !== UNASSIGNED_KEY || val.totalValue > 0)
      .sort((a, b) => a.className.localeCompare(b.className));
  };

  const classSummaries = computeClassSummaries();

  // Dynamic computations for Subject-wise summaries
  const computeSubjectSummaries = () => {
    const subjects: Record<string, {
      subjectName: string;
      skusCount: number;
      opening: number;
      received: number;
      issued: number;
      damaged: number;
      current: number;
      retailValuation: number;
      costValuation: number;
      items: any[];
    }> = {};

    stockData.forEach((row: any) => {
      if (row.item_type === "Kit" || row.category === "Kits" || (row.item_code || "").startsWith("KIT-")) return;

      const subName = getSubjectFromItem(row.item_name, row.item_code);
      if (!subjects[subName]) {
        subjects[subName] = {
          subjectName: subName,
          skusCount: 0,
          opening: 0,
          received: 0,
          issued: 0,
          damaged: 0,
          current: 0,
          retailValuation: 0,
          costValuation: 0,
          items: []
        };
      }

      const sub = subjects[subName];
      sub.skusCount += 1;
      sub.opening += row.opening_qty;
      sub.received += row.received_qty;
      sub.issued += row.issued_qty;
      sub.damaged += row.damaged_qty;
      sub.current += row.current_stock;
      
      const sellPrice = lastKnownSellPrices[row.id] || 0;
      const buyPrice = lastKnownBuyPrices[row.id] || 0;
      
      sub.retailValuation += row.current_stock * sellPrice;
      sub.costValuation += row.current_stock * buyPrice;
      sub.items.push({
        ...row,
        sellPrice,
        buyPrice,
        retailVal: row.current_stock * sellPrice,
        costVal: row.current_stock * buyPrice
      });
    });

    return Object.values(subjects).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  };

  const subjectSummaries = computeSubjectSummaries();

  // Discover stock of pre-assembled Grade Kit items
  const getKitStock = (kit: Kit) => {
    const kitSku = `KIT-${kit.kit_name.toUpperCase().replace(/\s+/g, "-")}`;
    const stockItem = stockData.find((s: any) => 
      s.item_code.toUpperCase() === kitSku || 
      s.item_name.toUpperCase() === `${kit.kit_name.toUpperCase()} KIT`
    );
    return stockItem ? stockItem.current_stock : 0;
  };

  // Find components of selected kit
  const selectedKit = kits.find(k => k.id === selectedKitId);
  const getKitComponentStatus = (kit: Kit) => {
    let maxKitsAssembled = Infinity;
    const itemsList = kit.inventory_kit_items.map(ki => {
      const stockItem = stockData.find((s: any) => s.id === ki.item_id);
      const availableStock = stockItem ? stockItem.current_stock : 0;
      const possibleAssemblies = Math.floor(availableStock / ki.quantity);
      if (possibleAssemblies < maxKitsAssembled) {
        maxKitsAssembled = possibleAssemblies;
      }
      return {
        id: ki.item_id,
        name: ki.inventory_items?.item_name || "Unknown Component",
        code: ki.inventory_items?.item_code || "",
        category: ki.inventory_items?.category || "",
        requiredQty: ki.quantity,
        availableStock,
        possibleAssemblies,
      };
    });
    return { itemsList, maxKitsAssembled: maxKitsAssembled === Infinity ? 0 : maxKitsAssembled };
  };

  // Dashboard Stats Calculations (Cost Valuation, Retail Valuation, Revenue, etc.)
  const computeDashboardStats = () => {
    let totalRetailValuation = 0;
    let totalCostValuation = 0;
    let totalRegularItemsCount = 0;
    let totalAssembledKitsCount = 0;
    
    stockData.forEach((row: any) => {
      const sellPrice = lastKnownSellPrices[row.id] || 0;
      const buyPrice = lastKnownBuyPrices[row.id] || 0;
      
      totalRetailValuation += row.current_stock * sellPrice;
      totalCostValuation += row.current_stock * buyPrice;
      
      if (row.item_type === "Kit" || row.category === "Kits" || (row.item_code || "").startsWith("KIT-")) {
        totalAssembledKitsCount += row.current_stock;
      } else {
        totalRegularItemsCount++;
      }
    });

    let totalSalesRevenue = 0;
    let totalCreditIssuesAmount = 0;
    let totalOnlinePaidSales = 0;

    salesData.forEach((row: any) => {
      totalSalesRevenue += row.amount;
      if (row.type === "Credit Distribution") {
        totalCreditIssuesAmount += row.amount;
      } else if (row.type === "Online Checkout") {
        totalOnlinePaidSales += row.amount;
      }
    });

    const lowStockCount = stockData.filter((r: any) => r.current_stock <= r.reorder_level).length;

    return {
      totalRetailValuation,
      totalCostValuation,
      totalRegularItemsCount,
      totalAssembledKitsCount,
      totalSalesRevenue,
      totalCreditIssuesAmount,
      totalOnlinePaidSales,
      lowStockCount
    };
  };

  const dashboardStats = computeDashboardStats();

  // Excel Export Handler for 9 report tabs
  function handleExportExcel() {
    let headers: string[] = [];
    let formatted: any[] = [];
    let fileName = `Inventory_Report_${reportType}`;

    if (reportType === "stock" || reportType === "reorder") {
      headers = ["SKU Code", "Item Name", "Category", "Opening Qty", "Inward (GRN)", "Outward Issued", "Damaged", "Current Stock", "Unit", "Reorder Level"];
      const source = reportType === "reorder" ? stockData.filter((r: any) => r.current_stock <= r.reorder_level) : filteredData;
      formatted = source.map(r => ({
        "SKU Code": r.item_code,
        "Item Name": r.item_name,
        "Category": r.category,
        "Opening Qty": r.opening_qty,
        "Inward (GRN)": r.received_qty,
        "Outward Issued": r.issued_qty,
        "Damaged": r.damaged_qty,
        "Current Stock": r.current_stock,
        "Unit": r.unit,
        "Reorder Level": r.reorder_level,
      }));
    } else if (reportType === "procurement") {
      headers = ["GRN No", "Invoice No", "Date", "Supplier", "SKU Code", "Item Name", "Category", "Quantity Received", "Rate", "Amount"];
      formatted = filteredData.map(r => ({
        "GRN No": r.grn_number,
        "Invoice No": r.invoice_number,
        "Date": new Date(r.receipt_date).toLocaleDateString("en-IN"),
        "Supplier": r.supplier_name,
        "SKU Code": r.item_code,
        "Item Name": r.item_name,
        "Category": r.category,
        "Quantity Received": r.quantity,
        "Rate": r.rate,
        "Amount": r.amount,
      }));
    } else if (reportType === "sales") {
      headers = ["Date", "Type", "Ref", "Customer / Recipient", "SKU / Kit", "Product / Bundle", "Category", "Qty", "Rate", "Amount", "Remarks"];
      formatted = filteredData.map(r => ({
        "Date": new Date(r.date).toLocaleDateString("en-IN"),
        "Type": r.type,
        "Ref": r.reference,
        "Customer / Recipient": r.customer,
        "SKU / Kit": r.item_code,
        "Product / Bundle": r.item_name,
        "Category": r.category,
        "Qty": r.quantity,
        "Rate": r.rate,
        "Amount": r.amount,
        "Remarks": r.remarks,
      }));
    } else if (reportType === "kits") {
      if (selectedKitId === "All") {
        headers = ["Kit Name", "Description", "Kit Price", "Total Components", "Current Assembled Stock", "Status"];
        formatted = kits.map(k => ({
          "Kit Name": k.kit_name,
          "Description": k.description || "—",
          "Kit Price": Number(k.total_price),
          "Total Components": k.inventory_kit_items.length,
          "Current Assembled Stock": getKitStock(k),
          "Status": k.status,
        }));
      } else if (selectedKit) {
        const { itemsList } = getKitComponentStatus(selectedKit);
        fileName = `Kit_Components_Audit_${selectedKit.kit_name}`;
        headers = ["Component Code", "Component Name", "Category", "Required Qty", "Current Available Stock", "Potential Kit Assembly Yield"];
        formatted = itemsList.map(item => ({
          "Component Code": item.code,
          "Component Name": item.name,
          "Category": item.category,
          "Required Qty": item.requiredQty,
          "Current Available Stock": item.availableStock,
          "Potential Kit Assembly Yield": item.possibleAssemblies,
        }));
      }
    } else if (reportType === "class") {
      headers = ["Class Name", "Kits Distributed", "Loose Items Distributed", "Total Distributed Value", "Outstanding Credit Value", "Online Checkout Paid"];
      formatted = classSummaries.map(c => ({
        "Class Name": c.className,
        "Kits Distributed": c.kitCount,
        "Loose Items Distributed": c.looseItemCount,
        "Total Distributed Value": c.totalValue,
        "Outstanding Credit Value": c.creditValue,
        "Online Checkout Paid": c.onlinePaid,
      }));
    } else if (reportType === "subject") {
      headers = ["Subject Name", "SKUs Under Subject", "Opening Stock", "Received (GRN)", "Issued / Sold", "Damaged", "Current Available", "Stock Retail Value", "Stock Cost Value"];
      formatted = subjectSummaries.map(s => ({
        "Subject Name": s.subjectName,
        "SKUs Under Subject": s.skusCount,
        "Opening Stock": s.opening,
        "Received (GRN)": s.received,
        "Issued / Sold": s.issued,
        "Damaged": s.damaged,
        "Current Available": s.current,
        "Stock Retail Value": s.retailValuation,
        "Stock Cost Value": s.costValuation,
      }));
    } else if (reportType === "student" && selectedStudent && studentLedger) {
      fileName = `Bookstore_Statement_${selectedStudent.name}`;
      headers = ["Transaction Date", "Type", "Reference", "SKU / Kit", "Product Name", "Category", "Quantity", "Rate", "Total Amount"];
      
      const ledgerRows: any[] = [];
      (studentLedger.issues || []).forEach((iss: any) => {
        iss.inventory_issue_items.forEach((ii: any) => {
          ledgerRows.push({
            "Transaction Date": new Date(iss.issue_date).toLocaleDateString("en-IN"),
            "Type": iss.is_credit_issue ? "Manual Credit Issue" : "Manual Direct Issue",
            "Reference": iss.id.slice(0, 8),
            "SKU / Kit": ii.inventory_items?.item_code || "",
            "Product Name": ii.inventory_items?.item_name || "",
            "Category": ii.inventory_items?.category || "",
            "Quantity": ii.quantity,
            "Rate": Number(ii.unit_price),
            "Total Amount": Number(ii.unit_price) * ii.quantity,
          });
        });
      });
      (studentLedger.checkouts || []).forEach((pc: any) => {
        ledgerRows.push({
          "Transaction Date": new Date(pc.paid_at || pc.created_at).toLocaleDateString("en-IN"),
          "Type": "Paid Online Checkout",
          "Reference": pc.token.slice(0, 8),
          "SKU / Kit": "KIT-ORDER",
          "Product Name": pc.description || "Grade Kit Bundle",
          "Category": "Kits",
          "Quantity": 1,
          "Rate": Number(pc.amount),
          "Total Amount": Number(pc.amount),
        });
      });
      (studentLedger.returns || []).forEach((ret: any) => {
        ret.inventory_return_items.forEach((ri: any) => {
          ledgerRows.push({
            "Transaction Date": new Date(ret.return_date).toLocaleDateString("en-IN"),
            "Type": `Return (${ri.status})`,
            "Reference": ret.id.slice(0, 8),
            "SKU / Kit": ri.inventory_items?.item_code || "",
            "Product Name": ri.inventory_items?.item_name || "",
            "Category": ri.inventory_items?.category || "",
            "Quantity": -ri.quantity,
            "Rate": Number(lastKnownSellPrices[ri.item_id] || 0),
            "Total Amount": -ri.quantity * Number(lastKnownSellPrices[ri.item_id] || 0),
          });
        });
      });
      formatted = ledgerRows;
    } else {
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    worksheet["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 3, 14) }));
    XLSX.writeFile(workbook, `${fileName}_${Date.now()}.xlsx`);
  }

  // Trigger browser printing
  function handlePrintPDF() {
    window.print();
  }

  // Common UI Layout Constants
  const labelClass = "block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1";
  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs";

  return (
    <div className="space-y-6 print:p-0 print:m-0 max-w-7xl mx-auto">
      
      {/* Dynamic PDF stylesheet for clean student ledger and class formatting */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            font-size: 10px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Panel (Hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#4DA8DA]" /> Bookstore & Inventory Reports
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Audit inventory levels, kit assemblies, class distributions, and student accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Academic Year:</label>
          <select
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4DA8DA] cursor-pointer"
            value={academicYearId}
            onChange={e => setAcademicYearId(e.target.value)}
          >
            {academicYears.map(ay => (
              <option key={ay.id} value={ay.id}>
                {ay.name} {ay.isCurrent ? "(Current)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-3 mb-5">
        <h1 className="text-lg font-black uppercase text-slate-900">VIRTUE GENESIS SCHOOLS BOOKSTORE REPORTS</h1>
        <p className="text-xs font-bold text-slate-500 mt-1 uppercase">
          AY: {academicYears.find(ay => ay.id === academicYearId)?.name} · 
          Report: {reportType.toUpperCase()} · 
          Date: {new Date().toLocaleDateString("en-IN")}
        </p>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="flex overflow-x-auto gap-1.5 border-b border-slate-200 pb-2 print:hidden scrollbar-none">
        {[
          { key: "dashboard", label: "Valuation & Dashboard", icon: TrendingUp },
          { key: "kits", label: "Grade Kits Audits", icon: Layers },
          { key: "class", label: "Class-wise Distributions", icon: Award },
          { key: "student", label: "Student Ledger", icon: UserCheck },
          { key: "subject", label: "Subject-wise Books", icon: BookMarked },
          { key: "stock", label: "Live Stock Valuation", icon: ClipboardCheck },
          { key: "procurement", label: "Inward Receipts Log", icon: Truck },
          { key: "sales", label: "Sales & Distributions", icon: ShoppingCart },
          { key: "reorder", label: "Low Stock & Reorders", icon: ShieldAlert },
        ].map(tab => {
          const TabIcon = tab.icon;
          const isActive = reportType === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setReportType(tab.key as any);
                setError("");
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-[#1E5F8A]/10 border-[#1E5F8A]/35 text-[#1E5F8A]"
                  : "bg-white border-slate-200 hover:border-slate-350 text-slate-650"
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Compact Filters & Actions Panel */}
      {reportType !== "dashboard" && reportType !== "class" && reportType !== "subject" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm print:hidden">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            
            {/* Dynamic filter fields inline */}
            <div className="flex-1">
              {reportType === "student" ? (
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Search Student Bookstore Account</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search student by name or admission number..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4DA8DA] focus:bg-white transition-all font-semibold"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                    />
                    {searchingStudents && (
                      <Loader2 className="absolute right-3 top-3 w-4 h-4 text-[#4DA8DA] animate-spin" />
                    )}
                  </div>

                  {/* Autocomplete Dropdown List */}
                  {studentsList.length > 0 && (
                    <div className="border border-slate-200 bg-white rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100 absolute z-20 w-full mt-1">
                      {studentsList.map(st => (
                        <button
                          key={st.id}
                          onClick={() => {
                            setSelectedStudent(st);
                            setStudentSearch("");
                            setStudentsList([]);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-all text-xs flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-slate-800">{st.name}</p>
                            <p className="text-[10px] font-semibold text-slate-400">Adm Number: {st.admissionNo}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-[#1E5F8A]/10 text-[#1E5F8A] rounded-full uppercase">
                            {st.className ? normalizeClassName(st.className) : "General"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : reportType === "kits" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Select Kit for Components Audit</label>
                    <select
                      className={inputClass}
                      value={selectedKitId}
                      onChange={e => setSelectedKitId(e.target.value)}
                    >
                      <option value="All">All Kits Catalog Overview</option>
                      {kits.map(k => (
                        <option key={k.id} value={k.id}>{k.kit_name} Kit</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Category Filter */}
                  <div>
                    <label className={labelClass}>Product Category</label>
                    <select className={inputClass} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                      <option value="All">All Categories</option>
                      {["Notebooks", "Textbooks", "Kits", "Uniforms", "Shoes", "ID Cards", "Diaries", "Stationery"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* SKU Filter */}
                  <div>
                    <label className={labelClass}>Specific Item</label>
                    <select className={inputClass} value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}>
                      <option value="All">All Items SKU</option>
                      {items.map(itm => (
                        <option key={itm.id} value={itm.id}>{itm.item_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Picker */}
                  <div>
                    <label className={labelClass}>From Date</label>
                    <input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>To Date</label>
                    <input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Actions aligned next to filters */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleExportExcel}
                disabled={loading || (reportType === "student" && !studentLedger)}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border-none"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export XLSX
              </button>
              <button
                onClick={handlePrintPDF}
                disabled={loading || (reportType === "student" && !studentLedger)}
                className="bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border-none"
              >
                <Printer className="w-4 h-4" /> Print / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Student Banner inside layout flow */}
      {reportType === "student" && selectedStudent && (
        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-bold print:hidden">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Currently Auditing: {selectedStudent.name} ({normalizeClassName(selectedStudent.className || "")})</span>
          </div>
          <button
            onClick={() => {
              setSelectedStudent(null);
              setStudentLedger(null);
            }}
            className="text-emerald-700 hover:text-emerald-950 underline border-none bg-transparent"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Dashboard, Class-wise, and Subject-wise export actions row */}
      {(reportType === "dashboard" || reportType === "class" || reportType === "subject") && (
        <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm print:hidden">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {reportType === "dashboard" && "Bookstore inventory metrics overview"}
            {reportType === "class" && `${classSummaries.length} class grades mapped`}
            {reportType === "subject" && `${subjectSummaries.length} book subjects analyzed`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border-none"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export XLSX
            </button>
            <button
              onClick={handlePrintPDF}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border-none"
            >
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
          </div>
        </div>
      )}

      {/* Errors (Hidden on print) */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Main Dynamic Report Viewport */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm print:hidden">
          <Loader2 className="w-8 h-8 text-[#4DA8DA] animate-spin" />
          <span className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest font-mono">Loading data nodes...</span>
        </div>
      ) : (
        <div className="print-area">
          
          {/* TAB 1: VALUATION & DASHBOARD SUMMARY */}
          {reportType === "dashboard" && (
            <div className="space-y-6">
              
              {/* Dashboard Metric Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-150 rounded-2xl p-5 shadow-sm hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Retail Inventory Value</p>
                      <h3 className="text-xl font-black text-indigo-950 mt-1">
                        ₹{dashboardStats.totalRetailValuation.toLocaleString("en-IN")}
                      </h3>
                    </div>
                    <div className="p-2 bg-white/70 rounded-xl text-indigo-600 shadow-sm">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Estimated Retail Asset Value</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-150 rounded-2xl p-5 shadow-sm hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Bookstore Valuation (Cost)</p>
                      <h3 className="text-xl font-black text-violet-950 mt-1">
                        ₹{dashboardStats.totalCostValuation.toLocaleString("en-IN")}
                      </h3>
                    </div>
                    <div className="p-2 bg-white/70 rounded-xl text-violet-600 shadow-sm">
                      <Layers className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-[10px] text-violet-600 font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Cost basis from GRN invoices</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-150 rounded-2xl p-5 shadow-sm hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500">Sales & Distributions</p>
                      <h3 className="text-xl font-black text-sky-950 mt-1">
                        ₹{dashboardStats.totalSalesRevenue.toLocaleString("en-IN")}
                      </h3>
                    </div>
                    <div className="p-2 bg-white/70 rounded-xl text-sky-600 shadow-sm">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 text-[10px] font-bold text-sky-600 flex flex-col gap-0.5">
                    <span>Paid Online: ₹{dashboardStats.totalOnlinePaidSales.toLocaleString("en-IN")}</span>
                    <span>Manual Credit: ₹{dashboardStats.totalCreditIssuesAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-150 rounded-2xl p-5 shadow-sm hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Low Stock Reorders</p>
                      <h3 className="text-xl font-black text-rose-950 mt-1">
                        {dashboardStats.lowStockCount} items
                      </h3>
                    </div>
                    <div className="p-2 bg-white/70 rounded-xl text-rose-600 shadow-sm">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-[10px] text-rose-600 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Stocks below threshold SKU limits</span>
                  </div>
                </div>
              </div>

              {/* Quick Data Breakdown Summary Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Assembled kit counts status */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#4DA8DA]" /> Live Kit Stock Status
                  </h3>
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {kits.map(kit => {
                      const stockVal = getKitStock(kit);
                      return (
                        <div key={kit.id} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-800">{kit.kit_name} Bundle</p>
                            <p className="text-[10px] font-semibold text-slate-400">Kit Code: KIT-{kit.kit_name.toUpperCase().replace(/\s+/g, "-")}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-slate-800">{stockVal} sets available</p>
                            <p className="text-[10px] text-[#1E5F8A] font-bold">₹{Number(kit.total_price).toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Class distributions overview */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#4DA8DA]" /> Class-wise Distributions Summary
                  </h3>
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {classSummaries.map(cls => (
                      <div key={cls.id} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{cls.className}</p>
                          <p className="text-[10px] font-semibold text-slate-400">
                            {cls.kitCount} Kit sets · {cls.looseItemCount} Loose items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900">₹{cls.totalValue.toLocaleString("en-IN")}</p>
                          <p className="text-[10px] text-amber-600 font-bold">Credit Unpaid: ₹{cls.creditValue.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: KITS REPORT & DRILLDOWN */}
          {reportType === "kits" && (
            <div className="space-y-6">
              
              {selectedKitId === "All" ? (
                /* Overall Kits Catalog */
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] print:bg-slate-100 print:text-slate-800">
                        <th className="px-6 py-4">Kit Name</th>
                        <th className="px-6 py-4">Kit Code</th>
                        <th className="px-6 py-4 text-center">Component Items Count</th>
                        <th className="px-6 py-4 text-right">Kit Retail Price</th>
                        <th className="px-6 py-4 text-center">Live Assembled Stock</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-center print:hidden">Audit Drilldown</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-650">
                      {kits.map(kit => {
                        const stockVal = getKitStock(kit);
                        return (
                          <tr key={kit.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-bold text-slate-900">{kit.kit_name} Kit</td>
                            <td className="px-6 py-4 font-mono text-slate-500">KIT-{kit.kit_name.toUpperCase().replace(/\s+/g, "-")}</td>
                            <td className="px-6 py-4 text-center font-semibold text-slate-700">{kit.inventory_kit_items.length} items</td>
                            <td className="px-6 py-4 text-right font-black text-slate-800">₹{Number(kit.total_price).toLocaleString("en-IN")}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${stockVal > 10 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                {stockVal} sets
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {kit.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center print:hidden">
                              <button
                                onClick={() => setSelectedKitId(kit.id)}
                                className="bg-[#1E5F8A]/10 text-[#1E5F8A] hover:bg-[#1E5F8A] hover:text-white px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer border-none"
                              >
                                View Components
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Particular Kit Detail Analysis */
                selectedKit && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl p-5 shadow-sm print:border-slate-300">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-850">{selectedKit.kit_name} Kit Components Analysis</h3>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-md uppercase">KIT-{selectedKit.kit_name.toUpperCase().replace(/\s+/g, "-")}</span>
                        </div>
                        <p className="text-slate-500 text-xs mt-1">{selectedKit.description || "Component specification audit and potential assembly calculation details"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Kit retail price</p>
                        <h2 className="text-lg font-black text-slate-900">₹{Number(selectedKit.total_price).toLocaleString("en-IN")}</h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Components Table */}
                      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-slate-350">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] print:bg-slate-100 print:text-slate-800">
                              <th className="px-5 py-4">Item SKU</th>
                              <th className="px-5 py-4">Component Name</th>
                              <th className="px-5 py-4">Category</th>
                              <th className="px-5 py-4 text-center">Required Qty</th>
                              <th className="px-5 py-4 text-center">Stock Available</th>
                              <th className="px-5 py-4 text-center">Potential Yield</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-650">
                            {getKitComponentStatus(selectedKit).itemsList.map(item => {
                              const isBottleneck = item.possibleAssemblies === getKitComponentStatus(selectedKit).maxKitsAssembled;
                              return (
                                <tr key={item.id} className={`hover:bg-slate-50/50 ${isBottleneck ? "bg-rose-50/40 hover:bg-rose-50/60" : ""}`}>
                                  <td className="px-5 py-4 font-mono text-slate-500">{item.code}</td>
                                  <td className="px-5 py-4 font-bold text-slate-850">{item.name}</td>
                                  <td className="px-5 py-4 text-slate-500">{item.category}</td>
                                  <td className="px-5 py-4 text-center font-bold text-slate-800">{item.requiredQty} pcs</td>
                                  <td className={`px-5 py-4 text-center font-bold ${item.availableStock < 5 ? "text-rose-600" : "text-slate-800"}`}>
                                    {item.availableStock} pcs
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                                      item.possibleAssemblies === 0
                                        ? "bg-rose-100 text-rose-700"
                                        : isBottleneck
                                        ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                                        : "bg-slate-50 text-slate-700"
                                    }`}>
                                      {item.possibleAssemblies} kits
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Right: Summary metrics box */}
                      <div className="lg:col-span-1 space-y-4 print:hidden">
                        <div className="bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-100 rounded-2xl p-5 shadow-sm text-xs">
                          <h4 className="font-extrabold uppercase text-[10px] text-sky-800 tracking-wider mb-2">Assembly Status Audit</h4>
                          <p className="text-slate-600 leading-relaxed font-medium">
                            Based on live stock levels of constituent items, you have enough raw inventory component material to assemble:
                          </p>
                          <div className="my-5 text-center">
                            <span className="text-4xl font-black text-slate-850">
                              {getKitComponentStatus(selectedKit).maxKitsAssembled}
                            </span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Additional Kits Max Yield</p>
                          </div>
                          <p className="text-slate-500 font-semibold leading-relaxed border-t border-slate-200 pt-3">
                            📌 Highlighted component rows determine the maximum assembly limit. Replenish these specific SKUs to increase kit assembly yield.
                          </p>
                        </div>

                        <button
                          onClick={() => setSelectedKitId("All")}
                          className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer border-none"
                        >
                          Back to Kits Catalog
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}

            </div>
          )}

          {/* TAB 3: CLASS-WISE REPORT */}
          {reportType === "class" && (
            <div className="space-y-6">
              
              {/* Class Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classSummaries.map(cls => (
                  <div key={cls.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 print:border-slate-350">
                    <div>
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
                        <div>
                          <h3 className="text-sm font-black text-slate-850">{cls.className}</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Bookstore Distributions</p>
                        </div>
                        <span className="px-2.5 py-1 bg-[#1E5F8A]/10 text-[#1E5F8A] rounded-full text-[10px] font-extrabold uppercase">
                          {cls.transactions.length} orders
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 mb-4">
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400">Kits Issued</p>
                          <p className="text-slate-800 font-extrabold text-sm mt-0.5">{cls.kitCount} sets</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400">Loose Items Issued</p>
                          <p className="text-slate-800 font-extrabold text-sm mt-0.5">{cls.looseItemCount} pcs</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-100/80 pt-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400">Credit Outstanding</p>
                          <p className="text-rose-600 font-bold mt-0.5">₹{cls.creditValue.toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400">Online Paid Sales</p>
                          <p className="text-emerald-600 font-bold mt-0.5">₹{cls.onlinePaid.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 mt-4 pt-3 flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Total Distribution</span>
                      <span className="text-base font-black text-slate-900">₹{cls.totalValue.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 4: STUDENT BOOKSTORE LEDGER STATEMENT */}
          {reportType === "student" && (
            <div>
              {!selectedStudent ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm print:hidden">
                  <Search className="w-10 h-10 text-slate-300" />
                  <h4 className="text-slate-700 font-bold text-xs uppercase mt-3 tracking-wider">Audit Student Bookstore Ledger</h4>
                  <p className="text-slate-400 text-[11px] mt-1 max-w-sm text-center">
                    Enter the student name or admission ID in the search box configuration above to fetch transaction statements.
                  </p>
                </div>
              ) : loadingLedger ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm print:hidden">
                  <Loader2 className="w-8 h-8 text-[#4DA8DA] animate-spin" />
                  <span className="text-slate-400 text-xs font-bold mt-2 uppercase">Loading statement database rows...</span>
                </div>
              ) : (
                studentLedger && (
                  <div className="space-y-6 animate-fadeIn">
                    
                    {/* Student profile header sheet */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 print:border-slate-350">
                      <div className="md:col-span-2 space-y-2 text-xs">
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{selectedStudent.name}</h3>
                        <div className="grid grid-cols-2 gap-y-1 text-slate-600 font-semibold">
                          <p>Admission No: <strong className="text-slate-800">{selectedStudent.admissionNo}</strong></p>
                          <p>Class & Section: <strong className="text-slate-800">{selectedStudent.className ? normalizeClassName(selectedStudent.className) : "—"} (Sec {selectedStudent.sectionName || "—"})</strong></p>
                          <p>Contact Phone: <strong className="text-slate-800">{studentLedger.student?.phone || "—"}</strong></p>
                          <p>Parent Contact: <strong className="text-slate-800">{studentLedger.student?.family?.fatherName || "Parent"} ({studentLedger.student?.family?.fatherPhone || "—"})</strong></p>
                        </div>
                      </div>
                      
                      {/* Financial balance computations */}
                      <div className="md:col-span-1 bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between text-xs font-bold print:bg-white print:border-slate-250">
                        <div className="flex justify-between items-center text-slate-500">
                          <span>Total Issued Assets:</span>
                          <span className="text-slate-900 font-extrabold">
                            ₹{(
                              (studentLedger.issues || []).reduce((acc: number, curr: any) => acc + Number(curr.charge_amount || 0), 0)
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-650 my-2">
                          <span>Online Payments:</span>
                          <span>
                            ₹{(
                              (studentLedger.checkouts || []).reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0)
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="border-t border-slate-200/80 pt-2 flex justify-between items-center text-slate-850">
                          <span className="uppercase text-[10px] tracking-wider font-extrabold">Accounts Receivable Balance:</span>
                          <span className="text-sm font-black text-[#1E5F8A]">
                            ₹{Math.max(
                              (studentLedger.issues || []).reduce((acc: number, curr: any) => acc + (curr.is_credit_issue ? Number(curr.charge_amount || 0) : 0), 0) - 
                              (studentLedger.checkouts || []).reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0),
                              0
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ledger Statement Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-slate-350">
                      <div className="px-5 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50 print:bg-slate-100">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Bookstore Transaction History</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ledger log</span>
                      </div>
                      
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] print:bg-slate-150 print:text-slate-800">
                            <th className="px-5 py-3.5">Date</th>
                            <th className="px-5 py-3.5">Transaction Type</th>
                            <th className="px-5 py-3.5">Ref ID</th>
                            <th className="px-5 py-3.5">SKU Code</th>
                            <th className="px-5 py-3.5">Product Name</th>
                            <th className="px-5 py-3.5">Category</th>
                            <th className="px-5 py-3.5 text-center">Quantity</th>
                            <th className="px-5 py-3.5 text-right">Unit Price</th>
                            <th className="px-5 py-3.5 text-right">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-650">
                          {/* 1. Loop manual issues */}
                          {(studentLedger.issues || []).map((iss: any) => 
                            iss.inventory_issue_items.map((ii: any, idx: number) => (
                              <tr key={`issue-${iss.id}-${idx}`} className="hover:bg-slate-50/50">
                                <td className="px-5 py-3 whitespace-nowrap">{new Date(iss.issue_date).toLocaleDateString("en-IN")}</td>
                                <td className="px-5 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                    iss.is_credit_issue 
                                      ? "bg-amber-50 text-amber-700 border-amber-200" 
                                      : "bg-slate-50 text-slate-700 border-slate-200"
                                  }`}>
                                    {iss.is_credit_issue ? "Credit Issue" : "Direct Issue"}
                                  </span>
                                </td>
                                <td className="px-5 py-3 font-mono font-bold text-slate-850">{iss.id.slice(0, 8)}</td>
                                <td className="px-5 py-3 font-mono text-slate-500">{ii.inventory_items?.item_code || "—"}</td>
                                <td className="px-5 py-3 font-semibold text-slate-900">{ii.inventory_items?.item_name || "—"}</td>
                                <td className="px-5 py-3 text-slate-550">{ii.inventory_items?.category || "—"}</td>
                                <td className="px-5 py-3 text-center font-bold text-slate-800">{ii.quantity}</td>
                                <td className="px-5 py-3 text-right">₹{Number(ii.unit_price).toLocaleString("en-IN")}</td>
                                <td className="px-5 py-3 text-right font-bold text-slate-850">₹{(ii.quantity * Number(ii.unit_price)).toLocaleString("en-IN")}</td>
                              </tr>
                            ))
                          )}

                          {/* 2. Loop online checkouts */}
                          {(studentLedger.checkouts || []).map((pc: any) => (
                            <tr key={`checkout-${pc.id}`} className="hover:bg-slate-50/50 bg-purple-50/15">
                              <td className="px-5 py-3 whitespace-nowrap">{new Date(pc.paid_at || pc.created_at).toLocaleDateString("en-IN")}</td>
                              <td className="px-5 py-3">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-205">
                                  Paid Online
                                </span>
                              </td>
                              <td className="px-5 py-3 font-mono font-bold text-slate-850">{pc.token.slice(0, 8)}</td>
                              <td className="px-5 py-3 font-mono text-slate-500">KIT-ORDER</td>
                              <td className="px-5 py-3 font-semibold text-slate-900">{pc.description || "Class Kit Bundle"}</td>
                              <td className="px-5 py-3 text-slate-550">Kits</td>
                              <td className="px-5 py-3 text-center font-bold text-slate-800">1</td>
                              <td className="px-5 py-3 text-right">₹{Number(pc.amount).toLocaleString("en-IN")}</td>
                              <td className="px-5 py-3 text-right font-black text-slate-850">₹{Number(pc.amount).toLocaleString("en-IN")}</td>
                            </tr>
                          ))}

                          {/* 3. Loop returns */}
                          {(studentLedger.returns || []).map((ret: any) => 
                            ret.inventory_return_items.map((ri: any, idx: number) => {
                              const issuePrice = Number(lastKnownSellPrices[ri.item_id] || 0);
                              return (
                                <tr key={`return-${ret.id}-${idx}`} className="hover:bg-slate-50/50 bg-rose-50/15 text-rose-800">
                                  <td className="px-5 py-3 whitespace-nowrap">{new Date(ret.return_date).toLocaleDateString("en-IN")}</td>
                                  <td className="px-5 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200`}>
                                      Return ({ri.status})
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 font-mono font-bold text-rose-750">{ret.id.slice(0, 8)}</td>
                                  <td className="px-5 py-3 font-mono text-rose-600">{ri.inventory_items?.item_code || "—"}</td>
                                  <td className="px-5 py-3 font-bold">{ri.inventory_items?.item_name || "—"}</td>
                                  <td className="px-5 py-3">{ri.inventory_items?.category || "—"}</td>
                                  <td className="px-5 py-3 text-center font-bold">-{ri.quantity}</td>
                                  <td className="px-5 py-3 text-right">₹{issuePrice.toLocaleString("en-IN")}</td>
                                  <td className="px-5 py-3 text-right font-extrabold">
                                    -₹{(ri.quantity * issuePrice).toLocaleString("en-IN")}
                                  </td>
                                </tr>
                              );
                            })
                          )}

                          {/* Empty logs check */}
                          {(!studentLedger.issues?.length && !studentLedger.checkouts?.length && !studentLedger.returns?.length) && (
                            <tr>
                              <td colSpan={9} className="text-center py-12 text-slate-400 font-bold">
                                No inventory transactions logged for this student.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 5: SUBJECT-WISE BOOK ANALYSIS */}
          {reportType === "subject" && (
            <div className="space-y-6">
              
              {/* Dynamic Subject Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjectSummaries.map((sub, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 print:border-slate-350">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-850">{sub.subjectName}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{sub.skusCount} distinct SKU products</p>
                      </div>
                      <BookIcon className="w-5 h-5 text-[#4DA8DA]" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 mb-4">
                      <div>
                        <p className="text-[9px] font-bold uppercase text-slate-400">Available Stock</p>
                        <p className="text-slate-800 font-extrabold text-sm mt-0.5">{sub.current} pcs</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase text-slate-400">Sales / Issued</p>
                        <p className="text-slate-850 font-bold text-sm mt-0.5">-{sub.issued} pcs</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100/80 pt-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="text-[9px] font-bold uppercase text-slate-400">GRN Inwarded</p>
                        <p className="text-emerald-600 font-semibold mt-0.5">+{sub.received} pcs</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase text-slate-400">Damaged Stock</p>
                        <p className="text-rose-600 font-semibold mt-0.5">-{sub.damaged} pcs</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 mt-4 pt-3 flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Estimated Retail Value</span>
                      <span className="text-base font-black text-slate-900">₹{sub.retailValuation.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 6: LIVE STOCK VALUATION REPORT */}
          {reportType === "stock" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-slate-350">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] print:bg-slate-150 print:text-slate-800">
                    <th className="px-6 py-4">Item SKU</th>
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-center">Opening</th>
                    <th className="px-6 py-4 text-center">Inward (GRN)</th>
                    <th className="px-6 py-4 text-center">Outward Issued</th>
                    <th className="px-6 py-4 text-center">Damaged</th>
                    <th className="px-6 py-4 text-center">Available Stock</th>
                    <th className="px-6 py-4 text-right">Est. Unit Price</th>
                    <th className="px-6 py-4 text-right">Stock Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-655">
                  {filteredData.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-12 text-slate-400 font-bold">No stock items match filters in database</td></tr>
                  ) : (
                    filteredData.map((r, idx) => {
                      const sellPrice = lastKnownSellPrices[r.id] || 0;
                      const stockValuation = r.current_stock * sellPrice;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-mono font-bold text-slate-800">{r.item_code}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">{r.item_name}</td>
                          <td className="px-6 py-4 text-slate-550">{r.category}</td>
                          <td className="px-6 py-4 text-center">{r.opening_qty}</td>
                          <td className="px-6 py-4 text-center text-emerald-600 font-semibold">+{r.received_qty}</td>
                          <td className="px-6 py-4 text-center text-rose-600 font-semibold">-{r.issued_qty}</td>
                          <td className="px-6 py-4 text-center text-rose-600 font-semibold">-{r.damaged_qty}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${r.current_stock > r.reorder_level ? "bg-slate-100 text-slate-800" : "bg-rose-50 text-rose-700 animate-pulse"}`}>
                              {r.current_stock}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">₹{sellPrice.toLocaleString("en-IN")}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-900">₹{stockValuation.toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 7: INWARD PROCUREMENT LOG */}
          {reportType === "procurement" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-slate-350">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] print:bg-slate-150 print:text-slate-800">
                    <th className="px-6 py-4">GRN No</th>
                    <th className="px-6 py-4">Invoice No</th>
                    <th className="px-6 py-4">Receipt Date</th>
                    <th className="px-6 py-4">Supplier Name</th>
                    <th className="px-6 py-4">Item SKU</th>
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4 text-center">Qty Inwarded</th>
                    <th className="px-6 py-4 text-right">Unit Cost</th>
                    <th className="px-6 py-4 text-right">Total Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-655">
                  {filteredData.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-400 font-bold">No procurement records matching selected filters</td></tr>
                  ) : (
                    filteredData.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">{r.grn_number}</td>
                        <td className="px-6 py-4 text-slate-600">{r.invoice_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{new Date(r.receipt_date).toLocaleDateString("en-IN")}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{r.supplier_name}</td>
                        <td className="px-6 py-4 font-mono text-slate-500">{r.item_code}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{r.item_name}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800">{r.quantity}</td>
                        <td className="px-6 py-4 text-right">₹{Number(r.rate).toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-900">₹{Number(r.amount).toLocaleString("en-IN")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 8: SALES & OUTWARD DISTRIBUTIONS */}
          {reportType === "sales" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-slate-350">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] print:bg-slate-150 print:text-slate-800">
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Ref ID</th>
                    <th className="px-5 py-4">Customer / Student</th>
                    <th className="px-5 py-4">SKU / Kit</th>
                    <th className="px-5 py-4">Product / Bundle</th>
                    <th className="px-5 py-4 text-center">Qty</th>
                    <th className="px-5 py-4 text-right">Rate</th>
                    <th className="px-5 py-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-655">
                  {filteredData.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-400 font-bold">No sales or outward distributions found in ledger logs</td></tr>
                  ) : (
                    filteredData.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4 whitespace-nowrap">{new Date(r.date).toLocaleDateString("en-IN")}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                            r.type === "Online Checkout"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : r.type === "Credit Distribution"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-slate-850">{r.reference}</td>
                        <td className="px-5 py-4 font-bold text-slate-900">{r.customer}</td>
                        <td className="px-5 py-4 font-mono text-slate-500">{r.item_code}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{r.item_name}</td>
                        <td className="px-5 py-4 text-center font-bold text-slate-850">{r.quantity}</td>
                        <td className="px-5 py-4 text-right">₹{Number(r.rate).toLocaleString("en-IN")}</td>
                        <td className="px-5 py-4 text-right font-black text-slate-900">₹{Number(r.amount).toLocaleString("en-IN")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 9: LOW STOCK & REORDER ALERTS */}
          {reportType === "reorder" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-slate-350">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] print:bg-slate-150 print:text-slate-800">
                    <th className="px-6 py-4">SKU Code</th>
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-center">Reorder Threshold</th>
                    <th className="px-6 py-4 text-center">Available Stock</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-655">
                  {stockData.filter((r: any) => r.current_stock <= r.reorder_level).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-emerald-600 font-bold">
                        🎉 Splendid! No inventory items are currently below reorder levels.
                      </td>
                    </tr>
                  ) : (
                    stockData
                      .filter((r: any) => r.current_stock <= r.reorder_level)
                      .map((r, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/30">
                          <td className="px-6 py-4 font-mono font-bold text-rose-800">{r.item_code}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">{r.item_name}</td>
                          <td className="px-6 py-4 text-slate-550">{r.category}</td>
                          <td className="px-6 py-4 text-center font-semibold text-slate-700">{r.reorder_level} {r.unit}</td>
                          <td className="px-6 py-4 text-center font-black text-rose-700">{r.current_stock} {r.unit}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border ${
                              r.current_stock === 0 
                                ? "bg-rose-100 text-rose-800 border-rose-200 animate-pulse" 
                                : "bg-amber-50 text-amber-700 border-amber-250"
                            }`}>
                              {r.current_stock === 0 ? "Stockout Alert" : "Low Inventory"}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
