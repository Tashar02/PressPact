import React from "react";
import { JobOrder } from "../../types";
import {
  FileCheck,
  Clock,
  ChevronRight,
  PlusCircle,
  Eye,
  AlertTriangle,
  Search,
  Receipt,
} from "lucide-react";

interface PublisherDashboardProps {
  jobs: JobOrder[];
  isCreditHold: boolean;
  overdueJob?: JobOrder | null;
  onNavigateTab: (tab: string) => void;
  onSelectJob: (job: JobOrder) => void;
  onOpenProof: (job: JobOrder) => void;
  onOpenInvoice: (job: JobOrder) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export const PublisherDashboard: React.FC<PublisherDashboardProps> = ({
  jobs,
  isCreditHold,
  overdueJob,
  onNavigateTab,
  onSelectJob,
  onOpenProof,
  onOpenInvoice,
  searchQuery,
  onSearchQueryChange,
}) => {
  const pendingProofs = jobs.filter((j) => j.status === "Awaiting Proof");
  const inProdJobs = jobs.filter((j) => j.status === "In Production");

  const filteredJobs = jobs.filter((j) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      j.id.toLowerCase().includes(q) ||
      j.bookTitle.toLowerCase().includes(q) ||
      j.pressName.toLowerCase().includes(q) ||
      j.laminationType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Credit Hold Banner Alert if Active */}
      {isCreditHold && (
        <div
          onClick={() => onNavigateTab("credit-status")}
          className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:opacity-95 transition-opacity animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/20 text-white">
                  AUTOMATED SYSTEM RULE
                </span>
                <span className="text-xs font-bold text-red-200">30+ Days Overdue</span>
              </div>
              <h3 className="text-lg font-black tracking-tight mt-0.5">
                Account Placed on Credit Hold
                {overdueJob ? ` (${overdueJob.pressName})` : ""}
              </h3>
              <p className="text-xs text-red-100 mt-0.5">
                New order placement disabled until unpaid invoice
                {overdueJob ? ` (${overdueJob.id} — BDT ${(overdueJob.amountBdt ?? 0).toLocaleString()})` : ""} is settled.
                Click to view unpaid invoice.
              </p>
            </div>
          </div>
          <button className="py-2.5 px-4 bg-white text-red-700 font-extrabold text-xs rounded-xl hover:bg-red-50 transition-colors shrink-0 shadow-md">
            View Credit Hold Notice &rarr;
          </button>
        </div>
      )}

      {/* Top Action & KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Proofs Needing Approval */}
        <div
          onClick={() => onNavigateTab("proofs")}
          className="p-5 bg-white rounded-2xl shadow-xs border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Proof Approvals
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-amber-700">{pendingProofs.length}</span>
              <span className="text-xs text-amber-800 font-semibold ml-2">awaiting your sign-off</span>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Orders in Production */}
        <div
          onClick={() => onNavigateTab("dashboard")}
          className="p-5 bg-white rounded-2xl shadow-xs border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              In Production
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#2e7d46] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-[#2e7d46]">{inProdJobs.length}</span>
              <span className="text-xs text-emerald-800 font-semibold ml-2">being laminated</span>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Place New Order Button Card */}
        <div
          onClick={() => onNavigateTab("new-order")}
          className="p-5 bg-gradient-to-br from-[#2e7d46] to-[#1e5830] text-white rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-green-200">
              New Lamination Job
            </span>
            <PlusCircle className="w-5 h-5 text-green-200 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2">
            <h4 className="text-base font-extrabold">Place New Order</h4>
            <p className="text-xs text-green-100">Check film coverage stock &amp; submit job request</p>
          </div>
        </div>
      </div>

      {/* Main Order Pipeline Table (PC Layout) */}
      <div className="bg-white rounded-2xl shadow-xs border border-green-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-gray-900 text-base">Active Publisher Orders Pipeline</h3>
            <p className="text-xs text-gray-500">Track real-time lamination progress &amp; delivery schedules.</p>
          </div>

          <div className="relative w-full md:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Filter orders..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46]/20 focus:border-[#2e7d46]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-green-50/60 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-green-100">
              <tr>
                <th className="p-4">Order ID &amp; Book Title</th>
                <th className="p-4">Assigned Press</th>
                <th className="p-4">Covers &amp; Lamination Finish</th>
                <th className="p-4">Delivery Due</th>
                <th className="p-4">Status &amp; Action Required</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No orders matching your search.
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
                    <div className="font-bold text-green-950">{job.pressName}</div>
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
                      <span>{job.dueDate}</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        job.status === "Awaiting Proof"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : job.status === "In Production"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : job.status === "Invoiced"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : "bg-gray-50 text-gray-800 border-gray-200"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {job.status === "Awaiting Proof" ? (
                        <button
                          onClick={() => onOpenProof(job)}
                          className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Review Proof</span>
                        </button>
                      ) : job.status === "Invoiced" || job.status === "Completed" ? (
                        <button
                          onClick={() => onOpenInvoice(job)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>View Invoice</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectJob(job)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-xs transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
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
