import React from "react";
import { UserRole, UserProfile } from "../../types";
import {
  LayoutDashboard,
  FileCheck,
  Calculator,
  Layers,
  Users,
  PlusCircle,
  AlertTriangle,
  Receipt,
  LogOut,
  Sparkles,
  BookOpen,
} from "lucide-react";

interface DesktopSidebarProps {
  role: UserRole;
  currentUser?: UserProfile | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingProofsCount: number;
  creditHoldCount: number;
  lowStockCount: number;
  onLogout: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  role,
  currentUser,
  activeTab,
  onTabChange,
  pendingProofsCount,
  creditHoldCount,
  lowStockCount,
  onLogout,
}) => {
  const isPress = role === "press_owner";

  const pressMenuItems = [
    {
      id: "dashboard",
      label: "Active Jobs",
      icon: LayoutDashboard,
    },
    {
      id: "proofs",
      label: "Proof Approvals",
      icon: FileCheck,
      badge: pendingProofsCount > 0 ? pendingProofsCount : undefined,
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      id: "yield",
      label: "Yield & Waste Math",
      icon: Calculator,
    },
    {
      id: "stock",
      label: "Film Stock Calculator",
      icon: Layers,
      badge: lowStockCount > 0 ? "Alert" : undefined,
      badgeColor: "bg-red-100 text-red-700 font-bold",
    },
    {
      id: "clients",
      label: "Publisher Clients & Credit",
      icon: Users,
      badge: creditHoldCount > 0 ? `${creditHoldCount} Hold` : undefined,
      badgeColor: "bg-red-500 text-white font-bold",
    },
  ];

  const publisherMenuItems = [
    {
      id: "dashboard",
      label: "My Orders",
      icon: LayoutDashboard,
    },
    {
      id: "new-order",
      label: "Place New Order",
      icon: PlusCircle,
      highlight: true,
    },
    {
      id: "proofs",
      label: "Proof Review Center",
      icon: FileCheck,
      badge: pendingProofsCount > 0 ? `${pendingProofsCount} Needs Approval` : undefined,
      badgeColor: "bg-amber-500 text-white font-bold",
    },
    {
      id: "invoices",
      label: "Verified Invoices",
      icon: Receipt,
    },
    {
      id: "credit-status",
      label: "Credit & Account Status",
      icon: AlertTriangle,
      badge: creditHoldCount > 0 ? "HOLD ACTIVE" : undefined,
      badgeColor: "bg-red-600 text-white font-bold",
    },
  ];

  const menuItems = isPress ? pressMenuItems : publisherMenuItems;

  // Compute display initials
  const displayName = currentUser?.fullName || (isPress ? "Md. Abdur Rahim" : "Shahin Ahmed Mithu");
  const displayBusiness = currentUser?.businessName || (isPress ? "Nova Lamination (Press)" : "Sagorica Publications");
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PP";

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-green-100 shadow-sm shrink-0 select-none z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-green-50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2e7d46] to-[#4caf50] flex items-center justify-center text-white shadow-md shadow-green-900/10">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight text-green-950 flex items-center gap-1.5">
            PressPact
          </h1>
          <p className="text-xs text-green-700/70 font-medium">Lamination &amp; Print Workflow</p>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div className="px-4 py-3 mx-4 mt-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50/60 border border-green-200/60 flex items-center gap-2.5">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
        <div className="overflow-hidden">
          <p className="text-[10px] font-bold text-green-800 uppercase tracking-widest">Active Workspace</p>
          <p className="text-xs font-bold text-green-950 truncate" title={displayBusiness}>
            {displayBusiness}
          </p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-3 text-[11px] font-bold text-green-800/80 uppercase tracking-wider mb-2">
          {isPress ? "Press Management" : "Publisher Portal"}
        </p>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 group ${
                isActive
                  ? "bg-[#2e7d46] text-white shadow-md shadow-[#2e7d46]/20"
                  : item.highlight
                  ? "bg-emerald-50 text-[#2e7d46] border border-emerald-200/80 hover:bg-emerald-100"
                  : "text-gray-700 hover:bg-green-50 hover:text-green-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? "text-white" : item.highlight ? "text-[#2e7d46]" : "text-gray-500 group-hover:text-green-700"
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.badgeColor || "bg-green-100 text-green-800"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom User / Quick Info */}
      <div className="p-4 border-t border-green-100 bg-green-50/30 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-gray-900 truncate" title={displayName}>
              {displayName}
            </p>
            <p className="text-[11px] text-gray-500 capitalize">{role.replace("_", " ")}</p>
          </div>
          <button
            onClick={onLogout}
            title="Log out"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
