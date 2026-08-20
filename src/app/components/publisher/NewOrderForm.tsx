import React, { useState } from "react";
import { FilmStockItem } from "../../types";
import {
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Layers,
  Calendar,
  ShieldAlert,
  Send,
  FileText,
  Phone,
} from "lucide-react";

  interface NewOrderFormProps {
  stock: FilmStockItem[];
  isCreditHold: boolean;
  onCreateOrder: (order: {
    bookTitle: string;
    coversCount: number;
    laminationType: "Matte 30μm" | "Gloss 24μm" | "Velvet Touch" | "Thermal Matte";
    dueDate: string;
  }) => void;
  onOpenCreditHoldNotice: () => void;
  overdueJob?: import("../../types").JobOrder | null;
}

export const NewOrderForm: React.FC<NewOrderFormProps> = ({
  stock,
  isCreditHold,
  onCreateOrder,
  onOpenCreditHoldNotice,
  overdueJob = null,
}) => {
  const [bookTitle, setBookTitle] = useState("");
  const [coversCount, setCoversCount] = useState<number>(2000);
  const [laminationType, setLaminationType] = useState<
    "Matte 30μm" | "Gloss 24μm" | "Velvet Touch" | "Thermal Matte"
  >("Matte 30μm");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Material Coverage Calculation
  const estimatedFilmMeters = Math.round(coversCount * 0.7);
  const currentStockItem = stock.find((s) => s.type === laminationType);
  const availableMeters = currentStockItem?.availableMeters || 0;
  const isStockInsufficient = estimatedFilmMeters > availableMeters;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreditHold) {
      onOpenCreditHoldNotice();
      return;
    }

    onCreateOrder({
      bookTitle,
      coversCount: Number(coversCount),
      laminationType,
      dueDate,
    });

    setSubmittedSuccess(true);
    setBookTitle("");
    setTimeout(() => setSubmittedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-2xl border border-emerald-200 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#2e7d46] uppercase tracking-widest">
            PUBLISHER ORDERING GATEWAY
          </span>
          <h3 className="text-lg font-extrabold text-green-950 mt-1">
            Submit New Lamination Job Request
          </h3>
          <p className="text-xs text-emerald-800">
            Real-time material coverage check validates press film stock before job acceptance.
          </p>
        </div>
      </div>

      {submittedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl font-semibold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#2e7d46]" />
          Order successfully submitted! The press has been notified to produce test proof.
        </div>
      )}

      {/* Credit Hold Notice View if Account Blocked */}
      {isCreditHold ? (
        <div className="bg-white rounded-2xl shadow-xs border border-red-200 p-6 space-y-5">
          <div className="p-4 bg-red-600 text-white rounded-xl flex items-center gap-3 shadow-md">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <div>
              <h4 className="font-black uppercase tracking-wider text-sm">
                New Order Action Disabled — Account on Credit Hold
              </h4>
              <p className="text-xs text-red-100 mt-0.5">
                Per system rules, new order placement is blocked while any invoice is over 30 days unpaid.
              </p>
            </div>
          </div>

          <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-red-500 font-medium">Overdue Order:</span>
              <span className="font-bold text-red-900">
                {overdueJob ? `${overdueJob.id} (${overdueJob.bookTitle})` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-500 font-medium">Overdue Days:</span>
              <span className="font-bold text-red-900">
                {overdueJob?.daysOverdue || 0} Days (&gt; 30 threshold)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-500 font-medium">Unpaid Amount Due:</span>
              <span className="font-bold text-red-900 text-sm">
                BDT {overdueJob?.amountBdt?.toLocaleString() ?? "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={onOpenCreditHoldNotice}
              className="flex-1 py-3 px-4 bg-red-600 text-white font-extrabold text-xs rounded-xl hover:bg-red-700 transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View Unpaid Invoice Details
            </button>
          </div>
        </div>
      ) : (
        /* Form for placing new order */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Order Input Form */}
          <div className="bg-white rounded-2xl shadow-xs border border-green-100 p-6 space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h4 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#2e7d46]" />
                Job Specifications
              </h4>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Book Title */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Book Title / Name</label>
                <input
                  type="text"
                  placeholder="e.g. Amar Desh (Bangla Sahitya)"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46] text-gray-900 font-medium"
                  required
                />
              </div>

              {/* Cover Count */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Total Covers to be Laminated
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={coversCount}
                    onChange={(e) => setCoversCount(Number(e.target.value))}
                    className="w-full pl-4 pr-16 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    covers
                  </span>
                </div>
              </div>

              {/* Lamination Finish Type */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Lamination Roll Type / Finish
                </label>
                <select
                  value={laminationType}
                  onChange={(e) =>
                    setLaminationType(
                      e.target.value as
                        | "Matte 30μm"
                        | "Gloss 24μm"
                        | "Velvet Touch"
                        | "Thermal Matte"
                    )
                  }
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                >
                  <option value="Matte 30μm">Matte 30μm Standard Roll</option>
                  <option value="Gloss 24μm">Gloss 24μm High-Gloss Roll</option>
                  <option value="Velvet Touch">Velvet Touch Soft Roll</option>
                  <option value="Thermal Matte">Thermal Matte Premium Roll</option>
                </select>
              </div>

              {/* Delivery Target Date */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Required Delivery Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46] text-gray-900"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isStockInsufficient}
                className={`w-full py-3 px-4 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  isStockInsufficient
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300 shadow-none"
                    : "bg-[#2e7d46] text-white hover:bg-[#256338] shadow-[#2e7d46]/20 cursor-pointer"
                }`}
              >
                <Send className="w-4 h-4" />
                Submit Order for Production
              </button>
            </form>
          </div>

          {/* Column 2: Material Coverage Calculator Real-Time Check (FR-3.2, 3.3) */}
          <div className="bg-white rounded-2xl shadow-xs border border-green-100 p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#2e7d46]" />
                  <h4 className="font-extrabold text-gray-900 text-base">
                    Material Coverage Calculator
                  </h4>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Calculates estimated film roll requirement against press inventory.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Selected Film Type:</span>
                  <span className="font-bold text-emerald-950">{laminationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Estimated Film Required:</span>
                  <span className="font-mono font-bold text-gray-900">
                    ~{estimatedFilmMeters.toLocaleString()} meters
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nova Press Current Stock:</span>
                  <span className="font-mono font-bold text-emerald-900">
                    {availableMeters.toLocaleString()} meters
                  </span>
                </div>
              </div>

              {/* Stock Check Warning Banner (FR-3.3) */}
              {isStockInsufficient ? (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Material Stock Shortage Warning!
                  </div>
                  <p className="text-[11px] leading-relaxed text-red-800">
                    Estimated film requirement ({estimatedFilmMeters}m) exceeds available stock on hand ({availableMeters}m) at Nova Lamination. Please select a different film type or contact press owner to restock before confirming order.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-[#2e7d46]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Film Coverage Stock Verified!
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-800">
                    Nova Lamination has sufficient film stock ({availableMeters}m available vs {estimatedFilmMeters}m required) to complete this run without stoppage.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
