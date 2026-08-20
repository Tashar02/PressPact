import React, { useState } from "react";
import { FilmStockItem, JobOrder } from "../../types";
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Save,
  HelpCircle,
  Lock,
  AlertCircle,
} from "lucide-react";

interface YieldValidatorProps {
  jobs: JobOrder[];
  stock: FilmStockItem[];
  selectedJob: JobOrder | null;
  onSelectJob: (job: JobOrder) => void;
  onVerifyYield: (
    jobId: string,
    totalIntake: number,
    goodOutput: number,
    wasteCount: number
  ) => Promise<void>;
  onGenerateInvoice: (job: JobOrder, amountBdt: number) => Promise<void>;
}

export const YieldValidator: React.FC<YieldValidatorProps> = ({
  jobs,
  stock,
  selectedJob,
  onSelectJob,
  onVerifyYield,
  onGenerateInvoice,
}) => {
  // Derive the freshest job by id so status/yield changes made in the parent
  // (approval, invoice) are always reflected here, not a stale snapshot.
  const selectedId = selectedJob?.id || jobs[0]?.id;
  const currentJob = jobs.find((j) => j.id === selectedId) || selectedJob || jobs[0];

  const [totalIntake, setTotalIntake] = useState<number>(
    currentJob?.totalIntake ?? currentJob?.coversCount ?? 0
  );
  const [goodOutput, setGoodOutput] = useState<number>(
    currentJob?.goodOutput ?? 0
  );
  const [wasteCount, setWasteCount] = useState<number>(
    currentJob?.wasteCount ?? 0
  );
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; isError?: boolean } | null>(null);

  // Sync state only when the job under audit actually changes; keying on the
  // id (not the whole object) stops a parent refresh from wiping typed input.
  React.useEffect(() => {
    if (currentJob) {
      setTotalIntake(currentJob.totalIntake ?? currentJob.coversCount ?? 0);
      setGoodOutput(currentJob.goodOutput ?? 0);
      setWasteCount(currentJob.wasteCount ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentJob?.id]);

  const showToast = (text: string, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const calculatedSum = Number(goodOutput) + Number(wasteCount);
  const isMatched = calculatedSum === Number(totalIntake);
  // Only jobs that completed proof approval and production may be invoiced
  const canInvoice = currentJob?.status === "In Production";
  // Once a job is invoiced its yield figures are frozen for the audit trail
  const isLocked = ["Invoiced", "Completed"].includes(currentJob?.status ?? "");

  // Invoice amount is always derived, never typed: good covers x the press's
  // per-cover price for this finish (set when the press restocks), plus good
  // covers x the cover-supply price when the press sourced the covers. Waste
  // covers are never billed.
  const pricePerCover =
    stock.find(
      (s) =>
        s.type === currentJob?.laminationType &&
        s.pressName === currentJob?.pressName
    )?.perCoverPriceBdt ?? 0;
  const coverCost = Math.round(goodOutput * (currentJob?.coverPriceBdt ?? 0));
  const invoiceAmount = Math.round(goodOutput * pricePerCover) + coverCost;
  const priceNotSet = pricePerCover <= 0;

  const handleSaveDraft = async () => {
    if (!currentJob) return;
    setIsSaving(true);
    try {
      await onVerifyYield(currentJob.id, totalIntake, goodOutput, wasteCount);
      showToast("Yield breakdown saved to job ledger draft.");
    } catch {
      showToast("Failed to save yield breakdown. Check your connection and try again.", true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvoiceClick = async () => {
    if (!isMatched || !canInvoice || !currentJob) return;
    if (priceNotSet) {
      showToast("Set a per-cover price for this finish in Inventory before invoicing.", true);
      return;
    }
    setIsSaving(true);
    try {
      await onVerifyYield(currentJob.id, totalIntake, goodOutput, wasteCount);
      await onGenerateInvoice(currentJob, invoiceAmount);
      showToast(`Invoice issued: BDT ${invoiceAmount.toLocaleString()} (Good covers x per-cover price${coverCost > 0 ? " + cover supply" : ""}).`);
    } catch {
      showToast("Failed to issue the invoice. The backend rejected the yield math — verify and try again.", true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#2e7d46] uppercase tracking-widest">
              LAMINATION MATH VALIDATOR
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-green-950 mt-1">
            Yield &amp; Waste Math Validator
          </h3>
          <p className="text-xs text-emerald-800 max-w-xl mt-0.5">
            Enforces Good Output + Waste = Total Intake equation before an invoice can be generated, preventing dishonest waste claims.
          </p>
        </div>

        {/* Order selector */}
        <div className="w-full sm:w-64 bg-white rounded-xl p-2 border border-emerald-200 shadow-xs">
          <label className="block text-[10px] font-bold text-green-900 uppercase tracking-wider px-2 mb-1">
            Select Order for Audit:
          </label>
          <select
            value={currentJob?.id || ""}
            onChange={(e) => {
              const found = jobs.find((j) => j.id === e.target.value);
              if (found) onSelectJob(found);
            }}
            className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
          >
            {jobs.map((j) => {
              const audited =
                j.yieldVerified || ["Invoiced", "Completed"].includes(j.status);
              return (
                <option key={j.id} value={j.id}>
                  {audited ? "✓" : "○"} {j.id}: {j.bookTitle} ({j.publisherName})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {toast && (
        <div
          className={`p-4 border rounded-xl font-semibold text-xs flex items-center gap-2 animate-in fade-in ${
            toast.isError
              ? "bg-red-50 border-red-300 text-red-900"
              : "bg-emerald-50 border-emerald-300 text-emerald-900"
          }`}
        >
          {toast.isError ? (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[#2e7d46] shrink-0" />
          )}
          {toast.text}
        </div>
      )}

      {currentJob && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Numeric Inputs */}
          <div className="bg-white rounded-2xl shadow-xs border border-green-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#2e7d46]" />
                <h4 className="font-extrabold text-gray-900 text-base">Lamination Data Entry</h4>
              </div>
              <button
                onClick={handleSaveDraft}
                disabled={isLocked}
                className={`px-3 py-1.5 border rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                  isLocked
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-green-50 text-[#2e7d46] border-green-200 hover:bg-green-100"
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                {isLocked ? "Frozen after invoicing" : "Save Draft"}
              </button>
            </div>

            {/* Order Details Header */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-500">Order:</span>{" "}
                <span className="font-bold text-gray-900">{currentJob.id}</span> ({currentJob.bookTitle})
              </div>
              <div>
                <span className="text-gray-500">Client:</span>{" "}
                <span className="font-bold text-green-950">{currentJob.publisherName}</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Field 1: Total Intake */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Total Paper Covers Received (Total Intake)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={totalIntake}
                    disabled={isLocked}
                    onChange={(e) => setTotalIntake(Number(e.target.value))}
                    className={`w-full pl-4 pr-16 py-2.5 bg-gray-50 border rounded-xl text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d46] ${isLocked ? "border-gray-200 cursor-not-allowed" : "border-gray-200"}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    covers
                  </span>
                </div>
              </div>

              {/* Field 2 & 3: Good Output vs Waste */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    Successfully Laminated (Good Output)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={goodOutput}
                      disabled={isLocked}
                      onChange={(e) => setGoodOutput(Number(e.target.value))}
                      className={`w-full pl-4 pr-16 py-2.5 bg-emerald-50/50 border rounded-xl text-sm font-mono font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-[#2e7d46] ${isLocked ? "border-emerald-200 cursor-not-allowed" : "border-emerald-300"}`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600">
                      covers
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-800 mb-1">
                    Wasted / Spoiled Covers
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={wasteCount}
                      disabled={isLocked}
                      onChange={(e) => setWasteCount(Number(e.target.value))}
                      className={`w-full pl-4 pr-16 py-2.5 bg-amber-50/50 border rounded-xl text-sm font-mono font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 ${isLocked ? "border-amber-200 cursor-not-allowed" : "border-amber-300"}`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-600">
                      covers
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Live Real-Time System Math Check */}
          <div className="bg-white rounded-2xl shadow-xs border border-green-100 p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h4 className="font-extrabold text-gray-900 text-base">System Real-Time Audit Check</h4>
                <p className="text-xs text-gray-500">Equation check required before invoice generation.</p>
              </div>

              {/* Equation Box */}
              <div
                className={`p-4 rounded-xl border font-mono text-sm space-y-2 transition-all ${
                  isMatched
                    ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                    : "bg-red-50/70 border-red-300 text-red-950"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-base">
                  <span>
                    {goodOutput} <span className="text-emerald-700 text-xs font-normal">(Good)</span> +{" "}
                    {wasteCount} <span className="text-amber-700 text-xs font-normal">(Waste)</span>
                  </span>
                  <span>= {calculatedSum}</span>
                </div>

                <div className="pt-2 border-t border-gray-200/50 flex items-center justify-between text-xs font-sans">
                  <span>Declared Total Intake: <strong>{totalIntake}</strong></span>
                  {isMatched ? (
                    <span className="font-bold text-[#2e7d46] flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Matched ✓
                    </span>
                  ) : (
                    <span className="font-bold text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Mismatch ✗ ({calculatedSum - totalIntake > 0 ? `+${calculatedSum - totalIntake}` : calculatedSum - totalIntake})
                    </span>
                  )}
                </div>
              </div>

              {/* Status Banner */}
              {!isMatched ? (
                <div className="p-3.5 bg-red-100/70 rounded-xl border border-red-200 text-xs text-red-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Invoice Generation Blocked!
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Good Output ({goodOutput}) + Waste ({wasteCount}) equals {calculatedSum}, which does not match Total Intake ({totalIntake}). Please adjust numeric entries.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-100/70 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#2e7d46]" />
                    Math Verification Passed!
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    The yield equation matches declared total intake. You may now proceed to generate the official invoice.
                  </p>
                </div>
              )}

              {isLocked && (
                <div className="p-3.5 bg-gray-100/70 rounded-xl border border-gray-200 text-xs text-gray-600 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                  <span>
                    This order is already invoiced. Yield figures are frozen and cannot be edited — they now form part of the permanent audit trail.
                  </span>
                </div>
              )}

              {!canInvoice && !isLocked && (
                <div className="p-3.5 bg-amber-100/70 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    This order has not been approved for production yet. Invoicing unlocks once the publisher approves the proof and the run is in production.
                  </span>
                </div>
              )}

              {/* Auto Invoice Amount — derived from good covers x per-cover price */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Invoice Amount (Auto-calculated)
                </label>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-sm font-mono font-black text-emerald-900 flex items-center justify-between gap-2">
                  <span className="leading-tight">
                    {goodOutput.toLocaleString()} good × BDT {pricePerCover.toLocaleString()}
                    {coverCost > 0 && (
                      <>
                        <br />
                        <span className="text-xs">
                          + {goodOutput.toLocaleString()} covers × BDT{" "}
                          {(currentJob?.coverPriceBdt ?? 0).toLocaleString()} (cover supply)
                        </span>
                      </>
                    )}
                    <br />= BDT {invoiceAmount.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-sans text-emerald-700 shrink-0">waste never billed</span>
                </div>
                {priceNotSet && (
                  <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 font-semibold flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    No per-cover price set for "{currentJob.laminationType}". Add a price in Inventory (Restock) before invoicing.
                  </p>
                )}
              </div>
            </div>

            {/* Invoice Button */}
            <button
              onClick={handleInvoiceClick}
              disabled={!isMatched || !canInvoice || priceNotSet || isSaving}
              className={`w-full py-3.5 px-4 font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                isMatched && canInvoice && !priceNotSet && !isSaving
                  ? "bg-[#2e7d46] text-white hover:bg-[#256338] shadow-[#2e7d46]/20 cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300 shadow-none"
              }`}
            >
              <Receipt className="w-4 h-4" />
              {isSaving ? "Issuing Invoice..." : "Generate & Issue Official Invoice"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};