import React, { useEffect, useState } from "react";
import { NotificationItem } from "../../types";
import {
  FileText,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Package,
  X,
} from "lucide-react";

interface NotificationToastsProps {
  toasts: NotificationItem[];
  onDismiss: (id: string) => void;
}

const toastIcon = (type: NotificationItem["type"]) => {
  switch (type) {
    case "proof":
      return <FileText className="w-4 h-4 text-amber-600" />;
    case "credit":
      return <ShieldAlert className="w-4 h-4 text-red-500" />;
    case "stock":
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    case "yield":
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    case "cover":
      return <Package className="w-4 h-4 text-indigo-500" />;
    default:
      return <CheckCircle className="w-4 h-4 text-[#2e7d46]" />;
  }
};

const Toast: React.FC<{ toast: NotificationItem; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in on mount, hold for ~5s, then fade out before removal.
    const raf = requestAnimationFrame(() => setVisible(true));
    const fadeTimer = setTimeout(() => setVisible(false), 4500);
    const removeTimer = setTimeout(() => onDismiss(toast.id), 5200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`pointer-events-auto w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
      }`}
      role="status"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
          {toastIcon(toast.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold text-gray-900 truncate">{toast.title}</p>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-gray-300 hover:text-gray-600 transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-0.5 leading-snug line-clamp-3">{toast.message}</p>
        </div>
      </div>
      <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
    </div>
  );
};

export const NotificationToasts: React.FC<NotificationToastsProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-20 right-4 lg:right-6 z-[60] space-y-3 pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};