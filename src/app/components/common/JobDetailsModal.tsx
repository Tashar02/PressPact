import React from "react";
import { JobOrder } from "../../types";
import {
  X,
  BookOpen,
  CheckCircle2,
  Clock,
  Building,
  User,
  Layers,
  FileCheck,
  AlertTriangle,
  Receipt,
  FileText,
  Lock,
} from "lucide-react";

interface JobDetailsModalProps {
  job: JobOrder | null;
  onClose: () => void;
  onOpenProof?: (job: JobOrder) => void;
  onOpenYield?: (job: JobOrder) => void;
  onOpenInvoice?: (job: JobOrder) => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  onClose,
  onOpenProof,
  onOpenYield,
  onOpenInvoice,
}) => {
  if (!job) return null;

  const stages: { label: string; done: boolean; active: boolean }[] = [
    { label: "Order Placed", done: true, active: job.status === "Order Placed" },
    {
      label: "Proof Approval",
      done: ["Awaiting Proof", "Proof Rejected", "In Production", "Yield Audit Pending", "Invoiced", "Completed"].includes(job.status),
      active: job.status === "Awaiting Proof" || job.status === "Proof Rejected",
    },
    {
      label: "In Production",
      done: ["In Production", "Yield Audit Pending", "Invoiced", "Completed"].includes(job.status),
      active: job.status === "In Production",
    },
    {
      label: "Yield Audit",
      done: ["Yield Audit Pending", "Invoiced", "Completed"].includes(job.status),
      active: job.status === "Yield Audit Pending",
    },
    {
      label: "Invoiced",
      done: ["Invoiced", "Completed"].includes(job.status),
      active: job.status === "Invoiced" || job.status === "Completed",
    },
  ];

  // Yield button is available only when job is ready for yield audit
  const yieldReady = ["Yield Audit Pending", "Invoiced", "Completed"].includes(job.status);
  // Invoice button available when already invoiced
  const isInvoiced = ["Invoiced", "Completed"].includes(job.status);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-green-100 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-[#2e7d46]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase">{job.id}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    job.status === "Awaiting Proof"
                      ? "bg-amber-100 text-amber-800"
                      : job.status === "In Production"
                      ? "bg-emerald-100 text-emerald-800"
                      : job.status === "Invoiced"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {job.status}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">{job.bookTitle}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Progress Tracker */}
        <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
          <p className="text-xs font-bold uppercase tracking-wider text-green-800 mb-3">
            Order Lifecycle Progress
          </p>
          <div className="grid grid-cols-5 gap-2">
            {stages.map((stg, i) => (
              <div key={i} className="text-center space-y-1">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stg.active
                      ? "bg-amber-500 ring-2 ring-amber-300"
                      : stg.done
                      ? "bg-[#2e7d46]"
                      : "bg-gray-200"
                  }`}
                />
                <p
                  className={`text-[10px] font-bold ${
                    stg.active ? "text-amber-800" : stg.done ? "text-green-900" : "text-gray-400"
                  }`}
                >
                  {stg.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Specifications Grid (Desktop Spacious View) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl space-y-2">
            <p className="font-bold text-gray-500 uppercase tracking-wider">Order Specifications</p>
            <div className="flex justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-600">Total Cover Count:</span>
              <span className="font-bold text-gray-900">{job.coversCount.toLocaleString()} covers</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-600">Lamination Finish:</span>
              <span className="font-bold text-emerald-800">{job.laminationType}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Film Coverage Est:</span>
              <span className="font-bold text-gray-900">{job.estimatedFilmMeters} meters</span>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl space-y-2">
            <p className="font-bold text-gray-500 uppercase tracking-wider">Stakeholders &amp; Dates</p>
            <div className="flex justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-600">Press:</span>
              <span className="font-bold text-gray-900">{job.pressName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-600">Publisher:</span>
              <span className="font-bold text-gray-900">{job.publisherName}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Delivery Due:</span>
              <span className="font-bold text-amber-700">{job.dueDate}</span>
            </div>
          </div>
        </div>

        {/* Proof Log Audit Trail */}
        {job.proofLogs && job.proofLogs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Proof Approval Log Trail (Binding Log)
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {job.proofLogs.map((log) => (
                <div key={log.id} className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 text-xs flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{log.actor}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-green-200 text-green-900">
                        {log.action}
                      </span>
                    </div>
                    {log.note && <p className="text-gray-700 mt-1 italic">"{log.note}"</p>}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
          {/* Proof Review — only for jobs awaiting proof */}
          {onOpenProof && (job.status === "Awaiting Proof" || job.status === "Proof Rejected") && (
            <button
              onClick={() => {
                onClose();
                onOpenProof(job);
              }}
              className="flex-1 py-2.5 px-4 bg-[#2e7d46] text-white font-semibold text-xs rounded-xl hover:bg-[#256338] transition-colors flex items-center justify-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              Open Proof Review Screen
            </button>
          )}

          {/* Yield Audit — press only. Greyed if job not yet at yield stage */}
          {onOpenYield && (
            yieldReady ? (
              <button
                onClick={() => {
                  onClose();
                  onOpenYield(job);
                }}
                className="flex-1 py-2.5 px-4 bg-emerald-50 text-[#2e7d46] border border-emerald-300 font-semibold text-xs rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                Open Yield Math Auditor
              </button>
            ) : (
              <div className="flex-1 relative group">
                <button
                  disabled
                  className="w-full py-2.5 px-4 bg-gray-100 text-gray-400 border border-gray-200 font-semibold text-xs rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Yield Audit (Not Ready)
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-56 bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2 text-center shadow-lg">
                  Yield audit unlocks after production is complete and press submits yield data.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            )
          )}

          {/* Invoice — shows when job is invoiced */}
          {onOpenInvoice && isInvoiced && (
            <button
              onClick={() => {
                onClose();
                onOpenInvoice(job);
              }}
              className="flex-1 py-2.5 px-4 bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-xs rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              View Invoice
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
