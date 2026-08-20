import React, { useState } from "react";
import { JobOrder } from "../../types";
import { daysPastDue, formatDateBn } from "../../lib/calc";
import {
  LayoutDashboard,
  FileCheck,
  Calculator,
  Clock,
  AlertTriangle,
  Eye,
  Search,
  ChevronRight,
  Package,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface PressDashboardProps {
  jobs: JobOrder[];
  onSelectJob: (job: JobOrder) => void;
  onOpenProof: (job: JobOrder) => void;
  onOpenYield: (job: JobOrder) => void;
  onNavigateTab: (tab: string) => void;
  onRespondCoverRequest: (jobId: string, accepted: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export const PressDashboard: React.FC<PressDashboardProps> = ({
  jobs,
  onSelectJob,
  onOpenProof,
  onOpenYield,
  onNavigateTab,
  onRespondCoverRequest,
  searchQuery,
  onSearchQueryChange,
}) => {
  const [filterStage, setFilterStage] = useState<string>("ALL");

  // Next task hint: tells the press exactly what to do next for each order and
  // jumps straight to the workflow tab it belongs to.
  const nextTask = (job: JobOrder): { label: string; tab: string } | null => {
    switch (job.status) {
      case "Order Placed":
        return { label: "Upload proof sample", tab: "proofs" };
      case "Proof Rejected":
        return { label: "Re-upload revised proof", tab: "proofs" };
      case "In Production":
        return { label: "Record yield audit", tab: "yield" };
      case "Awaiting Proof":
      case "Invoiced":
      case "Completed":
        return null;
      default:
        return null;
    }
  };

  const activeJobsCount = jobs.filter((j) => j.status !== "Completed").length;
  const pendingProofsCount = jobs.filter((j) => j.status === "Awaiting Proof").length;
  const pendingYieldCount = jobs.filter((j) => j.status === "In Production").length;
  const coverRequests = jobs.filter((j) => j.coverStatus === "requested");

  // An invoice is "overdue" the moment it crosses 30 days past due, whether it
  // was stored as Unpaid or Overdue — the same rule the credit hold uses.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueCount = jobs.filter(
    (j) =>
      j.paymentStatus !== "Paid" &&
      j.invoiceDueDate &&
      daysPastDue(j.invoiceDueDate, today) > 30
  ).length;

  const filteredJobs = jobs.filter((j) => {
    const matchesStage =
      filterStage === "ALL"
        ? true
        : filterStage === "PROOF"
        ? j.status === "Awaiting Proof" || j.status === "Proof Rejected"
        : filterStage === "PRODUCTION"
        ? j.status === "In Production"
        : filterStage === "INVOICED"
        ? j.status === "Invoiced" || j.status === "Completed"
        : true;

    const matchesSearch =
      j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.publisherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.laminationType.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStage && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* PC Screen Multi-Column KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Jobs */}
        <div
          onClick={() => setFilterStage("ALL")}
          className="p-5 bg-white rounded-2xl shadow-xs border border-green-100 hover:border-green-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Active Orders
            </span>
            <div className="w-9 h-9 rounded-xl bg-green-50 text-[#2e7d46] flex items-center justify-center group-hover:scale-110 transition-transform">
              <LayoutDashboard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">{activeJobsCount}</span>
            <span className="text-xs text-green-700 font-semibold">in shop floor</span>
          </div>
        </div>

        {/* KPI 2: Proofs Pending Sign-off */}
        <div
          onClick={() => onNavigateTab("proofs")}
          className="p-5 bg-white rounded-2xl shadow-xs border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Awaiting Publisher Proof
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-700">{pendingProofsCount}</span>
            <span className="text-xs text-amber-600 font-semibold">needs sign-off</span>
          </div>
        </div>

        {/* KPI 3: In Production (Ready for Yield Audit) */}
        <div
          onClick={() => onNavigateTab("yield")}
          className="p-5 bg-white rounded-2xl shadow-xs border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              In Production
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-800">{pendingYieldCount}</span>
            <span className="text-xs text-emerald-700 font-semibold">ready for yield audit</span>
          </div>
        </div>

        {/* KPI 4: Credit Holds */}
        <div
          onClick={() => onNavigateTab("clients")}
          className="p-5 bg-white rounded-2xl shadow-xs border border-red-100 hover:border-red-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Credit Holds
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-600">{overdueCount}</span>
            <span className="text-xs text-red-500 font-semibold">30+ days overdue</span>
          </div>
        </div>
      </div>

      {/* Cover Supply Requests Awaiting Decision */}
      {coverRequests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xs border border-indigo-200 overflow-hidden animate-in fade-in">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-gray-900 text-base">
                Cover Supply Requests Awaiting Your Decision
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">
                {coverRequests.length}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {coverRequests.map((job) => (
              <div key={job.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-gray-900 text-sm">{job.id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                      COVER REQUESTED
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">{job.bookTitle}</p>
                  <p className="text-[11px] text-gray-500">
                    <strong className="text-indigo-800">{job.coverType}</strong> · Client:{" "}
                    {job.publisherName} · Offered{" "}
                    <span className="font-mono font-bold text-gray-900">
                      BDT {(job.coverRequestPriceBdt ?? 0).toLocaleString()}/cover
                    </span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => onRespondCoverRequest(job.id, true)}
                    className="py-2 px-4 bg-[#2e7d46] text-white font-bold text-xs rounded-xl hover:bg-[#256338] transition-colors flex items-center gap-1.5 shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accept &amp; Proceed
                  </button>
                  <button
                    onClick={() => onRespondCoverRequest(job.id, false)}
                    className="py-2 px-4 bg-white border-2 border-red-500 text-red-600 font-bold text-xs rounded-xl hover:bg-red-50 transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject (Keep Order)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Data Table Section (PC Layout) */}
      <div className="bg-white rounded-2xl shadow-xs border border-green-100 overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-gray-900 text-base">Press Floor Orders Pipeline</h3>
            <p className="text-xs text-gray-500">
              Manage lamination runs, upload test proofs, and validate output yield.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Filter orders..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46]/20 focus:border-[#2e7d46]"
              />
            </div>

            {/* Stage Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFilterStage("ALL")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStage === "ALL" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All ({jobs.length})
              </button>
              <button
                onClick={() => setFilterStage("PROOF")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStage === "PROOF" ? "bg-white text-amber-800 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Proofing
              </button>
              <button
                onClick={() => setFilterStage("PRODUCTION")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStage === "PRODUCTION" ? "bg-white text-emerald-800 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Production
              </button>
              <button
                onClick={() => setFilterStage("INVOICED")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStage === "INVOICED" ? "bg-white text-blue-800 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Invoiced
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-green-50/60 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-green-100">
              <tr>
                <th className="p-4">Order ID &amp; Book Title</th>
                <th className="p-4">Publisher Client</th>
                <th className="p-4">Covers &amp; Finish</th>
                <th className="p-4">Delivery Due</th>
                <th className="p-4">Current Stage</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No orders matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-green-50/30 transition-colors">
                    <td className="p-4">
                      <div className="font-extrabold text-gray-900 text-sm">{job.id}</div>
                      <div className="text-gray-600 text-xs mt-0.5">{job.bookTitle}</div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-green-950">{job.publisherName}</div>
                    </td>

                    <td className="p-4">
                      <div className="font-mono font-bold text-gray-900">
                        {job.coversCount.toLocaleString()} covers
                      </div>
                      <div className="text-emerald-800 text-[11px] font-semibold">{job.laminationType}</div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-gray-800">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{formatDateBn(job.dueDate)}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          job.status === "Awaiting Proof"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : job.status === "Proof Rejected"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : job.status === "In Production"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : job.status === "Invoiced"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : "bg-gray-50 text-gray-800 border-gray-200"
                        }`}
                      >
                        {job.status}
                      </span>
                      {(() => {
                        const task = nextTask(job);
                        return task ? (
                          <button
                            onClick={() => onNavigateTab(task.tab)}
                            className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-[#2e7d46] bg-green-50 border border-green-200 rounded-lg px-2 py-1 hover:bg-green-100 transition-colors"
                          >
                            Next: {task.label} <ChevronRight className="w-3 h-3" />
                          </button>
                        ) : null;
                      })()}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {job.status === "Awaiting Proof" || job.status === "Proof Rejected" ? (
                          <button
                            onClick={() => onOpenProof(job)}
                            className="px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 font-semibold text-xs transition-colors flex items-center gap-1"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Proof Log</span>
                          </button>
                        ) : job.status === "In Production" ? (
                          <button
                            onClick={() => onOpenYield(job)}
                            className="px-3 py-1.5 bg-[#2e7d46] text-white rounded-lg hover:bg-[#256338] font-semibold text-xs transition-colors flex items-center gap-1"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span>Yield Audit</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onSelectJob(job)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-xs transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
