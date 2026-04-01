"use client";

import React from 'react';
import { 
  BarChart3, 
  Factory, 
  Database, 
  ShieldAlert, 
  Zap,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  description: string;
}

const NAVIGATION: NavItem[] = [
  { name: 'Pulse Dashboard', href: '/developer/v2', icon: BarChart3, description: 'Real-time system health' },
  { name: 'Resource Factory', href: '/developer/v2/factory', icon: Factory, description: 'Provision schools & branches' },
  { name: 'Identity Registry', href: '/developer/v2/registry', icon: Database, description: 'Manage global tenants' },
  { name: 'Crisis Console', href: '/developer/v2/crisis', icon: ShieldAlert, description: 'Emergency surgical tools' },
];

export function V2Sidebar({ isOpen }: { isOpen: boolean }) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-slate-200 z-50 shadow-2xl flex flex-col transition-transform duration-300 transform translate-x-0"
    >
      <div className="h-20 flex items-center px-8 border-b border-slate-50">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/30">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <span className="ml-4 text-xl font-black italic tracking-tighter">VIRTUE <span className="text-indigo-600">V2</span></span>
      </div>

      <nav className="flex-1 p-6 space-y-2">
        {NAVIGATION.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all",
                isActive 
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-600")} />
              <div className="flex flex-col">
                  <span className="text-sm font-bold tracking-tight">{item.name}</span>
                  <span className={cn("text-[9px] font-medium leading-none mt-0.5", isActive ? "text-indigo-100" : "text-slate-400")}>
                      {item.description}
                  </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-slate-50">
          <div className="p-4 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                  <div className="text-[10px] font-black text-indigo-900">Health Pulse</div>
                  <div className="text-[9px] font-bold text-indigo-700 uppercase">99.9% Nominal</div>
              </div>
              <div className="ml-auto w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          </div>
      </div>
    </aside>
  );
}
