import React from "react";
import { JobOrder } from "../../types";
import { X, Printer, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

interface InvoiceModalProps {
  job: JobOrder | null;
  onClose: () => void;
  onMarkPaid?: (jobId: string) => void;
  isPressOwner?: boolean;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  job,
  onClose,
  onMarkPaid,
  isPressOwner = false,
}) => {
  if (!job) return null;

  const total = job.totalIntake ?? job.coversCount;
  const good = job.goodOutput;
  const waste = job.wasteCount;
  const mathMatched = good != null && waste != null && good + waste === total;
  const isPaid = job.paymentStatus === "Paid";
  const isOverdue = job.paymentStatus === "Overdue" || (job.daysOverdue || 0) > 30;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-green-100 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
        {/* Header bar */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
                OFFICIAL INVOICE
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  isPaid
                    ? "bg-green-100 text-green-800"
                    : isOverdue
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {job.paymentStatus || "Unpaid"}
              </span>
            </div>
            <h3 className="text-xl font-black text-gray-900 mt-1">
              Invoice #{job.invoiceId || `INV-${job.id.replace("#", "")}`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Print Invoice"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Press vs Publisher header info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-green-50/40 rounded-xl border border-green-100 text-xs">
          <div>
            <p className="font-bold text-gray-400 uppercase tracking-wider mb-1">Issued By (Press)</p>
            <p className="font-bold text-green-950 text-sm">{job.pressName}</p>
            <p className="text-gray-600">{job.pressOwnerName}</p>
            <p className="text-gray-500">Dhaka, Bangladesh</p>
          </div>
          <div>
            <p className="font-bold text-gray-400 uppercase tracking-wider mb-1">Billed To (Publisher)</p>
            <p className="font-bold text-green-950 text-sm">{job.publisherName}</p>
            <p className="text-gray-500">Dhaka, Bangladesh</p>
          </div>
        </div>

        {/* Itemized Order Line Items */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Line Item Summary</p>
          <table className="w-full text-xs text-left border border-gray-100 rounded-xl overflow-hidden">
            <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Description</th>
                <th className="p-3 text-center">Finish</th>
                <th className="p-3 text-right">Good Quantity</th>
                <th className="p-3 text-right">Amount (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-3">
                  <p className="font-bold text-gray-900">{job.bookTitle}</p>
                  <p className="text-[10px] text-gray-400">Order ID: {job.id}</p>
                </td>
                <td className="p-3 text-center font-medium text-emerald-800">{job.laminationType}</td>
                <td className="p-3 text-right font-mono font-bold text-gray-800">
                  {good != null ? `${good.toLocaleString()} covers` : "—"}
                </td>
                <td className="p-3 text-right font-mono font-bold text-gray-900">
                  BDT {job.amountBdt?.toLocaleString() ?? "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Verified Yield & Waste Breakdown Panel (FR-2.3) */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2e7d46]" />
              <span className="text-xs font-bold text-green-950 uppercase tracking-wider">
                System Math Audit
              </span>
            </div>
            {mathMatched ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-[#2e7d46] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> EQUATION MATCHED
              </span>
            ) : good != null && waste != null ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> MISMATCH DETECTED
              </span>
            ) : (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-gray-100 text-gray-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> YIELD NOT RECORDED
              </span>
            )}
          </div>

          <div className="font-mono text-xs bg-white p-3 rounded-lg border border-emerald-100 text-gray-800 flex items-center justify-between">
            <span>
              {good ?? "—"} <span className="text-emerald-700">(Good)</span> +{" "}
              {waste ?? "—"} <span className="text-amber-700">(Waste)</span> ={" "}
              <strong>{good != null && waste != null ? good + waste : "—"}</strong>
            </span>
            <span className="text-gray-500 font-sans text-[11px]">
              Declared Total Intake: <strong>{total ?? "—"} covers</strong>
            </span>
          </div>

          <p className="text-[11px] text-emerald-800/80 italic leading-snug">
            "This mathematical breakdown is logged permanently on the platform before invoice generation to protect both press and publisher."
          </p>
        </div>

        {/* Total & Due dates */}
        <div className="flex items-center justify-between p-4 bg-gray-900 text-white rounded-xl">
          <div>
            <p className="text-xs text-gray-400 font-medium">Total Amount Due</p>
            <p className="text-2xl font-black text-emerald-400">
              BDT {job.amountBdt?.toLocaleString() ?? "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Due Date</p>
            <p className={`text-sm font-bold ${isOverdue && !isPaid ? "text-red-400" : "text-white"}`}>
              {job.invoiceDueDate || "—"}
            </p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {isPressOwner && !isPaid && onMarkPaid && (
            <button
              onClick={() => {
                onMarkPaid(job.id);
                onClose();
              }}
              className="flex-1 py-2.5 px-4 bg-[#2e7d46] text-white font-semibold text-xs rounded-xl hover:bg-[#256338] transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Payment Received (Lift Credit Hold)
            </button>
          )}

          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-gray-100 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
