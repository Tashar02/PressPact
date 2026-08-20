import React from "react";
import { JobOrder } from "../../types";
import {
  ShieldAlert,
  AlertTriangle,
  FileText,
  Phone,
  CheckCircle2,
  XCircle,
  Building,
} from "lucide-react";

interface CreditHoldBannerProps {
  overdueJob: JobOrder | null;
  onOpenInvoice: (job: JobOrder) => void;
  onOpenContact: () => void;
}

export const CreditHoldBanner: React.FC<CreditHoldBannerProps> = ({
  overdueJob,
  onOpenInvoice,
  onOpenContact,
}) => {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top Warning Banner */}
      <div className="p-6 bg-red-600 text-white rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/20 text-white tracking-widest">
              SYSTEM CREDIT GOVERNANCE
            </span>
            <h3 className="text-xl font-black tracking-tight mt-0.5">
              Account Placed on Credit Hold
            </h3>
          </div>
        </div>
        <p className="text-xs text-red-100 leading-relaxed">
          When an invoice crosses 30 days past due, new order placement is automatically suspended by the system to maintain transparent credit terms.
        </p>
      </div>

      {/* Credit Hold Specs Card */}
      {overdueJob && (
        <div className="bg-white rounded-2xl shadow-xs border border-red-200 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h4 className="font-extrabold text-gray-900 text-base">Overdue Invoice Details</h4>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-700">
              {overdueJob.daysOverdue ?? "—"} DAYS OVERDUE
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 space-y-2">
              <span className="font-bold text-red-800 uppercase tracking-wider text-[10px]">
                Originating Order
              </span>
              <div className="flex justify-between py-1 border-b border-red-100">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-bold text-gray-900">{overdueJob.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-red-100">
                <span className="text-gray-600">Book Title:</span>
                <span className="font-bold text-gray-900">{overdueJob.bookTitle}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Press Name:</span>
                <span className="font-bold text-gray-900">{overdueJob.pressName}</span>
              </div>
            </div>

            <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 space-y-2">
              <span className="font-bold text-red-800 uppercase tracking-wider text-[10px]">
                Financial Statement
              </span>
              <div className="flex justify-between py-1 border-b border-red-100">
                <span className="text-gray-600">Invoice Due Date:</span>
                <span className="font-bold text-red-700">{overdueJob.invoiceDueDate || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-red-100">
                <span className="text-gray-600">Days Past Due:</span>
                <span className="font-bold text-red-700">
                  {overdueJob.daysOverdue ?? "—"} Days (&gt;30 limit)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Total Unpaid Amount:</span>
                <span className="font-extrabold text-red-900 text-sm">
                  BDT {overdueJob.amountBdt?.toLocaleString() ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#2e7d46] shrink-0" />
            <span>
              <strong>Automatic Restoration:</strong> The Credit Hold will be removed automatically as soon as{" "}
              {overdueJob.pressOwnerName ? `${overdueJob.pressOwnerName} (${overdueJob.pressName})` : overdueJob.pressName} marks this invoice paid.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onOpenInvoice(overdueJob)}
              className="py-3 px-4 bg-red-600 text-white font-extrabold text-xs rounded-xl hover:bg-red-700 transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View &amp; Print Unpaid Invoice
            </button>

            <button
              onClick={onOpenContact}
              className="py-3 px-4 bg-white border-2 border-[#2e7d46] text-[#2e7d46] font-extrabold text-xs rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Call {overdueJob.pressName}{overdueJob.pressOwnerName ? ` (${overdueJob.pressOwnerName})` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
