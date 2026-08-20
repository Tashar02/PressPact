import React, { useState, useRef } from "react";
import { JobOrder, ProofLog } from "../../types";
import { jobService } from "../../services/jobService";
import {
  Upload,
  FileCheck,
  BookOpen,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  Camera,
  Loader2,
} from "lucide-react";

interface ProofUploadManagerProps {
  jobs: JobOrder[];
  selectedJob: JobOrder | null;
  onSelectJob: (job: JobOrder) => void;
  onUploadProof: (jobId: string, photoUrl: string, note: string) => void;
}

export const ProofUploadManager: React.FC<ProofUploadManagerProps> = ({
  jobs,
  selectedJob,
  onSelectJob,
  onUploadProof,
}) => {
  const currentJob = selectedJob || jobs[0];
  const [photoUrl, setPhotoUrl] = useState(
    currentJob?.proofPhotoUrl || ""
  );
  const [note, setNote] = useState(currentJob?.proofNote || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccessToast, setIsSuccessToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Proofs may only be submitted for orders that have not entered production
  const proofableStatuses = ["Order Placed", "Awaiting Proof", "Proof Rejected"];
  const canUploadProof = currentJob ? proofableStatuses.includes(currentJob.status) : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const localPreview = URL.createObjectURL(file);
      setPhotoUrl(localPreview);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentJob || !canUploadProof) return;

    setIsUploading(true);
    setErrorMessage(null);
    let finalUrl = photoUrl;

    try {
      if (selectedFile) {
        finalUrl = await jobService.uploadProofImageFile(selectedFile, currentJob.id);
      }
      onUploadProof(currentJob.id, finalUrl, note);
      setIsSuccessToast(true);
      setTimeout(() => setIsSuccessToast(false), 4000);
    } catch (err) {
      console.error("Proof submission error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Proof upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">
              QUALITY CONTROL GATE
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-amber-950 mt-1">
            Digital Proof Approval Gate
          </h3>
          <p className="text-xs text-amber-800 max-w-xl mt-0.5">
            Replaces manual quality sign-off with logged approvals. Jobs cannot enter full production until approved.
          </p>
        </div>

        {/* Job Dropdown Selector */}
        <div className="w-full sm:w-64 bg-white rounded-xl p-2 border border-amber-200 shadow-xs">
          <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider px-2 mb-1">
            Select Order to Proof:
          </label>
          <select
            value={currentJob?.id || ""}
            onChange={(e) => {
              const found = jobs.find((j) => j.id === e.target.value);
              if (found) {
                onSelectJob(found);
                setPhotoUrl(found.proofPhotoUrl || "");
                setNote(found.proofNote || "");
                setSelectedFile(null);
              }
            }}
            className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.id}: {j.bookTitle} ({j.publisherName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isSuccessToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl font-semibold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#2e7d46]" />
          Proof photo and note successfully uploaded &amp; status changed to "Awaiting Proof". Notification sent to {currentJob?.publisherName}.
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-900 rounded-xl font-semibold text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Spacious PC 2-Column Grid */}
      {currentJob && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Upload Proof Form */}
          <div className="bg-white rounded-2xl shadow-xs border border-green-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#2e7d46]" />
                Upload Test Sample Photo
              </h4>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  currentJob.status === "Awaiting Proof"
                    ? "bg-amber-100 text-amber-800"
                    : currentJob.status === "Proof Rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {currentJob.status}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo Preview & File Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">
                    Sample Cover Photo
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#2e7d46] font-bold hover:underline flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" /> Choose from Device
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group border-2 border-dashed border-green-200 rounded-2xl p-4 bg-green-50/40 text-center hover:border-[#2e7d46] transition-colors cursor-pointer"
                >
                  {photoUrl ? (
                    <div className="relative overflow-hidden rounded-xl h-56 bg-gray-900">
                      <img
                        src={photoUrl}
                        alt="Test proof"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between p-3">
                        <span className="text-xs text-white font-medium flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5" /> Sample Lamination Output
                        </span>
                        <span className="text-[10px] text-emerald-300 font-bold bg-black/40 px-2 py-0.5 rounded-full">
                          Click to Change Photo
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-gray-400 space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-green-600" />
                      <p className="text-xs font-bold text-gray-600">Click to capture or attach photo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Note for Publisher */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Finish &amp; Quality Note for Publisher
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Applied Matte finish (30 micron). Check corners for paste depth and gloss reflection..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46] text-gray-900"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isUploading || !canUploadProof}
                className={`w-full py-3 px-4 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  canUploadProof && !isUploading
                    ? "bg-[#2e7d46] text-white hover:bg-[#256338] shadow-[#2e7d46]/20"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border border-gray-300"
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading Sample Photo...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Proof &amp; Request Publisher Sign-Off</span>
                  </>
                )}
              </button>

              {!canUploadProof && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  This order is already past proof stage and cannot accept a new proof upload.
                </p>
              )}
            </form>
          </div>

          {/* Column 2: Publisher Response & Permanent Audit Trail */}
          <div className="bg-white rounded-2xl shadow-xs border border-green-100 p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-amber-600" />
                  Publisher Sign-Off History
                </h4>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order ID:</span>
                  <span className="font-bold text-gray-900">{currentJob.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Book Title:</span>
                  <span className="font-bold text-gray-900">{currentJob.bookTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Publisher Client:</span>
                  <span className="font-bold text-green-950">{currentJob.publisherName}</span>
                </div>
              </div>

              {/* History Timeline */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Permanent Timestamped History
                </p>

                <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
                  {currentJob.proofLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        log.action === "approved"
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                          : log.action === "rejected"
                          ? "bg-red-50/70 border-red-200 text-red-950"
                          : "bg-gray-50 border-gray-200 text-gray-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          {log.action === "approved" && <CheckCircle2 className="w-4 h-4 text-[#2e7d46]" />}
                          {log.action === "rejected" && <XCircle className="w-4 h-4 text-red-600" />}
                          {log.action === "uploaded" && <Clock className="w-4 h-4 text-amber-600" />}
                          {log.actor} ({log.role === "press_owner" ? "Press" : "Publisher"})
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">{log.timestamp}</span>
                      </div>
                      {log.note && <p className="italic text-gray-700 bg-white/80 p-2 rounded-lg border border-gray-100">"{log.note}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Production Status:</strong> System strictly blocks the "In Production" status unless the publisher clicks "Approve for full run".
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
