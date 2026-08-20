import React from "react";
import { JobOrder } from "../../types";
import { formatDateBn } from "../../lib/calc";
import { Receipt, ShieldCheck, Eye, AlertCircle } from "lucide-react";

interface VerifiedInvoiceViewProps {
  jobs: JobOrder[];
  onOpenInvoice: (job: JobOrder) => void;
}

export const VerifiedInvoiceView: React.FC<VerifiedInvoiceViewProps> = ({
  jobs,
  onOpenInvoice,
}) => {
  const invoicedJobs = jobs.filter(
    (j) => j.status === "Invoiced" || j.status === "Completed" || j.paymentStatus
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 p-5 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-widest">
              TRANSPARENT BILLING AUDIT
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-blue-950 mt-1">
            Verified Invoices &amp; Yield Math Breakdown
          </h3>
          <p className="text-xs text-blue-800 max-w-xl mt-0.5">
            View read-only Good Output + Waste = Total Intake breakdowns for all issued invoices, ensuring no inflated waste figures.
          </p>
        </div>
      </div>

      {/* PC Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-green-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h4 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#2e7d46]" />
            Issued Invoices Ledger
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-green-50/60 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-green-100">
              <tr>
                <th className="p-4">Invoice # &amp; Book Title</th>
                <th className="p-4">Verified Yield Breakdown</th>
                <th className="p-4">Amount (BDT)</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {invoicedJobs.map((job) => {
                const total = job.totalIntake ?? job.coversCount;
                const good = job.goodOutput;
                const waste = job.wasteCount;
                const mathMatched = good != null && waste != null && good + waste === total;

                return (
                  <tr key={job.id} className="hover:bg-green-50/30 transition-colors">
                    <td className="p-4">
                      <div className="font-extrabold text-gray-900 text-sm">
                        Invoice #{job.invoiceId || `INV-${job.id.replace("#", "")}`}
                      </div>
                      <div className="text-gray-600 text-xs mt-0.5">{job.bookTitle} ({job.id})</div>
                    </td>

                    <td className="p-4">
                      <div className="font-mono text-xs text-gray-900">
                        {good ?? "—"} <span className="text-emerald-700">(Good)</span> +{" "}
                        {waste ?? "—"} <span className="text-amber-700">(Waste)</span> ={" "}
                        <strong>{good != null && waste != null ? good + waste : "—"}</strong>
                      </div>
                      {mathMatched ? (
                        <div className="text-[10px] text-emerald-800 font-semibold flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3 h-3 text-[#2e7d46]" /> System Verified Matched
                        </div>
                      ) : good != null && waste != null ? (
                        <div className="text-[10px] text-red-700 font-semibold flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-3 h-3 text-red-600" /> Math Mismatch
                        </div>
                      ) : null}
                    </td>

                    <td className="p-4">
                      <div className="font-mono font-extrabold text-gray-900 text-sm">
                        BDT {job.amountBdt?.toLocaleString() ?? "—"}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="text-gray-800 font-bold">{formatDateBn(job.invoiceDueDate || "") || "—"}</div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          job.paymentStatus === "Paid"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : job.paymentStatus === "Overdue"
                            ? "bg-red-100 text-red-700 border-red-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                      >
                        {job.paymentStatus || "Unpaid"}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => onOpenInvoice(job)}
                        className="px-3 py-1.5 bg-[#2e7d46] text-white rounded-lg hover:bg-[#256338] font-bold text-xs transition-colors flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Invoice</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
