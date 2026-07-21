import React, { useState } from "react";
import { JobOrder } from "../../types";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  BookOpen,
  Image as ImageIcon,
  MessageSquare,
  Clock,
  ShieldCheck,
  X,
  Send,
  AlertCircle,
} from "lucide-react";

interface ProofApprovalGateProps {
  jobs: JobOrder[];
  selectedJob: JobOrder | null;
  onSelectJob: (job: JobOrder) => void;
  onApproveProof: (jobId: string) => void;
  onRejectProof: (jobId: string, feedbackNote: string) => void;
}

export const ProofApprovalGate: React.FC<ProofApprovalGateProps> = ({
  jobs,
  selectedJob,
  onSelectJob,
  onApproveProof,
  onRejectProof,
}) => {
  const currentJob = selectedJob || jobs.find((j) => j.status === "Awaiting Proof") || jobs[0];

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleApprove = () => {
    if (!currentJob) return;
    onApproveProof(currentJob.id);
    setToastMessage("Proof approved for full production! Logged permanently on PressPact ledger.");
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentJob || !rejectFeedback) return;

    onRejectProof(currentJob.id, rejectFeedback);
    setShowRejectModal(false);
    setRejectFeedback("");
    setToastMessage(`Proof rejected and feedback sent to ${currentJob.pressName}.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">
              BINDING QUALITY GATEWAY
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-amber-950 mt-1">
            Digital Proof Approval Gate
          </h3>
          <p className="text-xs text-amber-800 max-w-xl mt-0.5">
            Review test sample cover photos uploaded by{" "}
            {currentJob?.pressName ?? "the press"}. Your approval or rejection is logged with a binding timestamp.
          </p>
        </div>

        {/* Order Selector */}
        <div className="w-full sm:w-64 bg-white rounded-xl p-2 border border-amber-200 shadow-xs">
          <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider px-2 mb-1">
            Select Order to Review:
          </label>
          <select
            value={currentJob?.id || ""}
            onChange={(e) => {
              const found = jobs.find((j) => j.id === e.target.value);
              if (found) onSelectJob(found);
            }}
            className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.id}: {j.bookTitle} ({j.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl font-semibold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#2e7d46]" />
          {toastMessage}
        </div>
      )}

      {currentJob && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Sample Cover Photo Preview */}
          <div className="bg-white rounded-2xl shadow-xs border border-green-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Order #{currentJob.id}
                </span>
                <h4 className="font-extrabold text-gray-900 text-base">{currentJob.bookTitle}</h4>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  currentJob.status === "Awaiting Proof"
                    ? "bg-amber-100 text-amber-800"
                    : currentJob.status === "In Production"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {currentJob.status}
              </span>
            </div>

            {/* High Res Photo Frame */}
            <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 shadow-inner h-72 group">
              <img
                src={
                  currentJob.proofPhotoUrl ||
                  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80"
                }
                alt="Uploaded proof sample"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                <div className="text-white space-y-0.5">
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    Uploaded Proof Sample (2 Test Covers)
                  </p>
                  <p className="text-[11px] text-gray-300">
                    Finish: <strong>{currentJob.laminationType}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Press Note */}
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Note From Press Owner
                {currentJob.pressOwnerName ? ` (${currentJob.pressOwnerName})` : currentJob.pressName ? ` (${currentJob.pressName})` : ""}:
              </p>
              <p className="text-xs text-gray-800 leading-relaxed font-medium">
                "{currentJob.proofNote || "Proof sample submitted. Please review carefully."}"
              </p>
            </div>
          </div>

          {/* Column 2: Binding Action Gate & History */}
          <div className="bg-white rounded-2xl shadow-xs border border-green-100 p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#2e7d46]" />
                  <h4 className="font-extrabold text-gray-900 text-base">
                    Binding Approval Decision
                  </h4>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Your action will permanently stamp the job ledger.
                </p>
              </div>

              {/* Status Action Panel */}
              {currentJob.status === "Awaiting Proof" ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      Please inspect the test proof carefully before approving. On approval,{" "}
                      {currentJob.pressName} will begin full run of {currentJob.coversCount.toLocaleString()} covers.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="py-3 px-4 bg-white border-2 border-red-500 text-red-600 font-extrabold text-xs rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject &amp; Send Feedback
                    </button>

                    <button
                      onClick={handleApprove}
                      className="py-3 px-4 bg-[#2e7d46] text-white font-extrabold text-xs rounded-xl hover:bg-[#256338] transition-colors shadow-md shadow-[#2e7d46]/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve for Full Run
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#2e7d46]" />
                  This proof has been approved for full production run.
                </div>
              )}

              {/* Timestamped Logs */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Timestamped Approval Logs
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {currentJob.proofLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 text-xs flex justify-between items-start"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{log.actor}</span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-green-100 text-green-800">
                            {log.action}
                          </span>
                        </div>
                        {log.note && <p className="text-gray-600 mt-1 italic">"{log.note}"</p>}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">{log.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Feedback Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-extrabold text-gray-900 text-base">Reject Proof &amp; Send Feedback</h3>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Required Feedback Text Note
                </label>
                <textarea
                  rows={4}
                  value={rejectFeedback}
                  onChange={(e) => setRejectFeedback(e.target.value)}
                  placeholder="Explain why the proof is rejected e.g. Lamination is peeling at spine edge, matte coating uneven, color depth too dark..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 font-medium"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit Rejection &amp; Notify Press
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="py-3 px-4 bg-gray-100 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
