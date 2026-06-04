"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Truck,
  FileSpreadsheet,
  ArrowRightLeft,
  ClipboardList,
  BarChart3,
  Settings,
  User,
  ArrowLeft,
  BookOpen,
  Link2,
  Search,
  Lock,
  Undo,
  ShieldAlert,
  ClipboardCheck,
  Receipt,
  Layers,
  Boxes
} from "lucide-react";

type SidebarProps = {
  user: {
    name: string;
    role: string;
    email: string;
  };
};

export default function InventorySidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", href: "/inventory", icon: LayoutDashboard },
    { name: "Item Catalog", href: "/inventory/items", icon: Package },
    { name: "Kits Management", href: "/inventory/kits", icon: Boxes },
    { name: "Suppliers", href: "/inventory/suppliers", icon: Truck },
    { name: "Purchase Orders", href: "/inventory/purchase-orders", icon: FileSpreadsheet },
    { name: "Goods Receipts (GRN)", href: "/inventory/goods-receipts", icon: ClipboardList },
    { name: "Stock Issues", href: "/inventory/issues", icon: ArrowRightLeft },
    { name: "Kit Converter / Bundler", href: "/inventory/converter", icon: Layers },
    { name: "Returns & Exchanges", href: "/inventory/returns", icon: Undo },
    { name: "Damaged Stock", href: "/inventory/damaged", icon: ShieldAlert },
    { name: "Physical Verification", href: "/inventory/verify", icon: ClipboardCheck },
    { name: "Supplier Payments", href: "/inventory/supplier-payments", icon: Receipt },
    { name: "Stock Ledger", href: "/inventory/stock", icon: BarChart3 },
    { name: "Bookstore Checkout", href: "/books-buy", icon: BookOpen },
    { name: "Generate Pay Link", href: "/inventory/fee-link", icon: Link2 },
    { name: "Payment Status Check", href: "/inventory/fee-link/status", icon: Search },
    { name: "Owner Dashboard", href: "/inventory/fee-link/owner", icon: Lock },
    { name: "Reports", href: "/inventory/reports", icon: FileSpreadsheet },
    { name: "Settings & Rollover", href: "/inventory/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#4DA8DA]/10 border border-[#4DA8DA]/30 rounded-2xl flex items-center justify-center shrink-0 shadow-sm shadow-[#4DA8DA]/10">
          <BookOpen className="w-5 h-5 text-[#4DA8DA]" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white leading-tight uppercase tracking-wider">Bookstore</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Inventory ERP</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-thin">
        {menuItems.map(item => {
          const isActive = pathname === item.href || (item.href !== "/inventory" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-[#1E5F8A]/80 to-[#4DA8DA]/20 text-white border border-[#4DA8DA]/30 shadow-md shadow-[#4DA8DA]/5"
                  : "hover:bg-slate-800/60 hover:text-white border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#4DA8DA]" : "text-slate-400"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Session Profile Card */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 p-2 bg-slate-900/60 border border-slate-800/40 rounded-xl mb-3">
          <div className="w-8 h-8 bg-slate-800 border border-slate-700/60 rounded-lg flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{user.name}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">{user.role}</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to School ERP
        </Link>
      </div>
    </aside>
  );
}
