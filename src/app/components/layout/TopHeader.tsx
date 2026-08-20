import React, { useState } from "react";
import { UserRole, UserProfile, NotificationItem } from "../../types";
import {
  Bell,
  Search,
  Menu,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  ShieldAlert,
  LogOut,
  User,
} from "lucide-react";

interface TopHeaderProps {
  role: UserRole;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  activeTabTitle: string;
  notifications: NotificationItem[];
  onMarkNotificationsRead: () => void;
  onSelectNotificationJob?: (jobId: string) => void;
  onMobileMenuToggle?: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  role,
  currentUser,
  onLogout,
  activeTabTitle,
  notifications,
  onMarkNotificationsRead,
  onSelectNotificationJob,
  onMobileMenuToggle,
  searchQuery,
  onSearchQueryChange,
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = notifications.filter((n) => n.unread).length;
  const isPress = role === "press_owner";

  const displayName = currentUser?.fullName || (isPress ? "Press Owner" : "Publisher");
  const displayBusiness = currentUser?.businessName || (isPress ? "Press Workspace" : "Publisher Workspace");

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-green-100 px-4 lg:px-6 py-3 flex items-center justify-between gap-4 shadow-xs">
      {/* Left section: Mobile menu toggle + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-green-50 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium truncate max-w-[120px] sm:max-w-none">
              {displayBusiness}
            </span>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs font-semibold text-green-700 capitalize">
              {isPress ? "Press Owner" : "Publisher Client"}
            </span>
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-gray-900 leading-tight">
            {activeTabTitle}
          </h2>
        </div>
      </div>

      {/* Center Search (PC screen view optimization) */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search orders (#ORD-009), books, clients, or film types..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2e7d46]/20 focus:border-[#2e7d46] transition-all text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Right controls: Notifications & User */}
      <div className="flex items-center gap-3">
        {/* Notifications Bell & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-800 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Card */}
          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-3.5 bg-green-50/60 border-b border-green-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-gray-900">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkNotificationsRead}
                    className="text-xs text-[#2e7d46] font-semibold hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-xs text-gray-400">No notifications.</p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (notif.jobId && onSelectNotificationJob) {
                          onSelectNotificationJob(notif.jobId);
                          setShowNotifs(false);
                        }
                      }}
                      className={`p-3.5 hover:bg-green-50/50 transition-colors cursor-pointer flex gap-3 ${
                        notif.unread ? "bg-emerald-50/30 font-medium" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.type === "proof" && <FileText className="w-4 h-4 text-amber-600" />}
                        {notif.type === "credit" && <ShieldAlert className="w-4 h-4 text-red-600" />}
                        {notif.type === "stock" && <AlertCircle className="w-4 h-4 text-orange-500" />}
                        {notif.type === "yield" && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-900">{notif.title}</p>
                          <span className="text-[10px] text-gray-400">{notif.timestamp}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 leading-snug">{notif.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Log out"
            className="lg:hidden p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
