import React, { useState, useEffect } from "react";
import { FilmStockItem, CoverTypeItem } from "../../types";
import { estimateFilmMeters, localTodayIso } from "../../lib/calc";
import {
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Layers,
  ShieldAlert,
  Send,
  FileText,
  XCircle,
  BookMarked,
} from "lucide-react";

interface NewOrderFormProps {
  stock: FilmStockItem[];
  presses: string[];
  coverTypes: CoverTypeItem[];
  isCreditHold: boolean;
  onCreateOrder: (order: {
    bookTitle: string;
    coversCount: number;
    laminationType: string;
    dueDate: string;
    pressName: string;
    coverSupply?: "client_supplied" | "press_purchased";
    coverType?: string;
    coverStatus?: "requested" | "approved" | "rejected";
    coverRequestPriceBdt?: number;
    coverPriceBdt?: number;
  }) => void;
  onOpenCreditHoldNotice: () => void;
  overdueJob?: import("../../types").JobOrder | null;
}

export const NewOrderForm: React.FC<NewOrderFormProps> = ({
  stock,
  presses,
  coverTypes,
  isCreditHold,
  onCreateOrder,
  onOpenCreditHoldNotice,
  overdueJob = null,
}) => {
  const [bookTitle, setBookTitle] = useState("");
  const [coversCount, setCoversCount] = useState<number>(2000);
  const [laminationType, setLaminationType] = useState<string>("");
  const [pressName, setPressName] = useState<string>(
    () => presses.find((p) => p.toLowerCase() === "nova lamination") || presses[0] || ""
  );
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  // Cover Supply selection
  const [coverSupply, setCoverSupply] = useState<"client_supplied" | "press_purchased">("client_supplied");
  const [coverType, setCoverType] = useState<string>("");
  const [coverRequestMode, setCoverRequestMode] = useState(false);
  const [coverRequestName, setCoverRequestName] = useState("");
  const [coverRequestPrice, setCoverRequestPrice] = useState<number>(0);
  const pressCoverTypes = coverTypes.filter((c) => c.pressName === pressName);
  
  // Auto-enable request mode when press has no configured cover types
  if (pressCoverTypes.length === 0 && coverSupply === "press_purchased" && !coverRequestMode) {
    setCoverRequestMode(true);
  }
  const selectedCoverType = pressCoverTypes.find((c) => c.name === coverType);
  const coverRequested = coverSupply === "press_purchased" && coverRequestMode;

  // Only the selected press's own roll types are offered, and coverage is
  // checked against that press's inventory (each press manages stock itself).
  const pressStock = stock.filter((s) => s.pressName === pressName);
  const finishTypes = Array.from(new Set(pressStock.map((s) => s.type)));

  // Keep the selected finish valid for the chosen press: default to the first
  // available type, and reset when the press (or its stock) changes.
  useEffect(() => {
    if (finishTypes.length === 0) {
      setLaminationType("");
    } else if (!finishTypes.includes(laminationType)) {
      setLaminationType(finishTypes[0]);
    }
  }, [pressName, finishTypes.join("|")]);

  // Material Coverage Calculation
  const estimatedFilmMeters = estimateFilmMeters(coversCount);
  const currentStockItem = pressStock.find((s) => s.type === laminationType);
  const availableMeters = currentStockItem?.availableMeters || 0;
  const isStockInsufficient = estimatedFilmMeters > availableMeters;
  const hasPressStock = finishTypes.length > 0;
  const todayIso = localTodayIso();
  const isPastDate = dueDate < todayIso;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreditHold) {
      onOpenCreditHoldNotice();
      return;
    }
    if (isPastDate) {
      setDateError("Delivery date cannot be in the past. Please pick a future date.");
      return;
    }
    setDateError(null);
    if (!laminationType) {
      setDateError(`${pressName} has not set up film inventory yet. Contact the press to restock.`);
      return;
    }
    if (coverSupply === "press_purchased" && !coverRequestMode && !coverType) {
      setDateError(`${pressName} has no cover types configured yet. Choose "Request a cover type" and offer a price, or supply your own covers.`);
      return;
    }
    if (coverRequested && !coverRequestName.trim()) {
      setDateError("Describe the cover type you want the press to source.");
      return;
    }
    if (coverRequested && (Number(coverRequestPrice) || 0) <= 0) {
      setDateError("Enter the per-cover price you are willing to pay for the press to source these covers.");
      return;
    }

    const isExistingType = coverSupply === "press_purchased" && !coverRequestMode && !!selectedCoverType;

    onCreateOrder({
      bookTitle,
      coversCount: Number(coversCount),
      laminationType,
      dueDate,
      pressName,
      coverSupply,
      coverType: coverRequested ? coverRequestName.trim() : isExistingType ? coverType : undefined,
      coverStatus: coverRequested ? "requested" : undefined,
      coverRequestPriceBdt: coverRequested ? Number(coverRequestPrice) || 0 : undefined,
      coverPriceBdt: isExistingType ? selectedCoverType.priceBdt : undefined,
    });

    setSubmittedSuccess(true);
    setBookTitle("");
    setCoverRequestMode(false);
    setCoverRequestName("");
    setCoverRequestPrice(0);
    setCoverType("");
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

      {dateError && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-900 rounded-xl font-semibold text-xs flex items-center gap-2 animate-in fade-in">
          <XCircle className="w-5 h-5 text-red-600" />
          {dateError}
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

              {/* Target Press */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Target Lamination Press</label>
                <select
                  value={pressName}
                  onChange={(e) => setPressName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                >
                  {presses.length > 0 ? (
                    presses.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))
                  ) : (
                    <option value="">No press registered</option>
                  )}
                </select>
              </div>

              {/* Lamination Finish Type — only the selected press's roll types */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Lamination Roll Type / Finish
                </label>
                <select
                  value={laminationType}
                  onChange={(e) => setLaminationType(e.target.value)}
                  disabled={!hasPressStock}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d46] disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {finishTypes.length > 0 ? (
                    finishTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  ) : (
                    <option value="">No roll types configured</option>
                  )}
                </select>
                {!hasPressStock && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1">
                    {pressName || "This press"} has not configured any film roll inventory yet. Contact the press owner to add roll types before ordering.
                  </p>
                )}
              </div>

              {/* Cover Supply Options */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Cover Supply Option
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCoverSupply("client_supplied")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      coverSupply === "client_supplied"
                        ? "border-[#2e7d46] bg-emerald-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookMarked className="w-4 h-4 text-[#2e7d46]" />
                      <span className="text-xs font-extrabold text-gray-900">Client Supplies Covers</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      You bring the printed covers to the press. No cover charge — lamination only.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCoverSupply("press_purchased")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      coverSupply === "press_purchased"
                        ? "border-[#2e7d46] bg-emerald-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#2e7d46]" />
                      <span className="text-xs font-extrabold text-gray-900">Press Buys Covers</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      The press sources the covers for you — a per-cover charge is added for the sourcing &amp; handling work.
                    </p>
                  </button>
                </div>

                {coverSupply === "press_purchased" && (
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3 mt-1 animate-in fade-in">
                    {pressCoverTypes.length > 0 ? (
                      <>
                        <select
                          value={coverRequestMode ? "__request__" : coverType}
                          onChange={(e) => {
                            if (e.target.value === "__request__") {
                              setCoverRequestMode(true);
                              setCoverType("");
                            } else {
                              setCoverRequestMode(false);
                              setCoverType(e.target.value);
                            }
                          }}
                          className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                        >
                          {!coverType && !coverRequestMode && (
                            <option value="">Select a cover type...</option>
                          )}
                          {pressCoverTypes.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name} — BDT {c.priceBdt.toLocaleString()}/cover
                            </option>
                          ))}
                          <option value="__request__">Request a cover type not listed...</option>
                        </select>

                        {!coverRequestMode && selectedCoverType && (
                          <div className="flex justify-between text-[11px] bg-white rounded-lg border border-indigo-100 px-3 py-2">
                            <span className="text-gray-600 font-medium">{selectedCoverType.name}</span>
                            <span className="font-extrabold text-indigo-800">
                              + BDT {selectedCoverType.priceBdt.toLocaleString()}/cover
                            </span>
                          </div>
                        )}
                      </>
) : (
                       <>
                        <div className="space-y-2 pt-1">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                              Cover Type Name
                            </label>
                            <input
                              type="text"
                              value={coverRequestName}
                              onChange={(e) => setCoverRequestName(e.target.value)}
                              className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                              Offered Price (BDT per cover)
                            </label>
                            <input
                              type="number"
                              value={coverRequestPrice}
                              min={0}
                              step={0.01}
                              onChange={(e) => setCoverRequestPrice(Number(e.target.value) || 0)}
                              className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                            />
                          </div>
                        </div>
                       </>
                     )}

                    {coverRequestMode && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                            Requested Cover Type
                          </label>
                          <input
                            type="text"
                            value={coverRequestName}
                            onChange={(e) => setCoverRequestName(e.target.value)}
                            placeholder="e.g. Art Card 250gsm"
                            className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                            Offered Per-Cover Price (BDT)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={coverRequestPrice}
                            onChange={(e) => setCoverRequestPrice(Number(e.target.value))}
                            className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {coverRequested && (
                      <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                        Your request will be sent to {pressName} for approval before production. If declined, your order stays on record.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Delivery Target Date */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Required Delivery Date</label>
                <input
                  type="date"
                  value={dueDate}
                  min={todayIso}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (e.target.value >= todayIso) setDateError(null);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46] text-gray-900 ${
                    isPastDate ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"
                  }`}
                  required
                />
                {isPastDate && (
                  <p className="text-[11px] text-red-700 font-semibold">Delivery date cannot be in the past.</p>
                )}
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
                  Calculates estimated film roll requirement against {pressName} inventory.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Selected Film Type:</span>
                  <span className="font-bold text-emerald-950">
                    {laminationType || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Estimated Film Required:</span>
                  <span className="font-mono font-bold text-gray-900">
                    ~{estimatedFilmMeters.toLocaleString()} meters
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{pressName} Current Stock:</span>
                  <span className="font-mono font-bold text-emerald-900">
                    {availableMeters.toLocaleString()} meters
                  </span>
                </div>
              </div>

              {/* Stock Check Warning Banner (FR-3.3) */}
              {!hasPressStock ? (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Press Inventory Not Configured!
                  </div>
                  <p className="text-[11px] leading-relaxed text-red-800">
                    {pressName || "This press"} has not added any lamination roll types yet. The press owner must set up their film inventory before orders can be accepted.
                  </p>
                </div>
              ) : isStockInsufficient ? (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Material Stock Shortage Warning!
                  </div>
                  <p className="text-[11px] leading-relaxed text-red-800">
                    Estimated film requirement ({estimatedFilmMeters}m) exceeds available stock on hand ({availableMeters}m) at {pressName}. Please select a different film type or contact the press owner to restock before confirming order.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-[#2e7d46]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Film Coverage Stock Verified!
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-800">
                    {pressName} has sufficient film stock ({availableMeters}m available vs {estimatedFilmMeters}m required) to complete this run without stoppage.
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