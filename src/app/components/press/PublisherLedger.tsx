import React from "react";
import { PublisherClient, JobOrder } from "../../types";
import {
  Users,
  ShieldAlert,
  CheckCircle2,
  Phone,
  FileText,
  DollarSign,
  AlertTriangle,
  Receipt,
} from "lucide-react";

interface PublisherLedgerProps {
  publishers: PublisherClient[];
  jobs: JobOrder[];
  onMarkInvoicePaid: (jobId: string) => void;
  onOpenContact: (name: string, phone: string) => void;
  onOpenInvoice: (job: JobOrder) => void;
}

export const PublisherLedger: React.FC<PublisherLedgerProps> = ({
  publishers,
  jobs,
  onMarkInvoicePaid,
  onOpenContact,
  onOpenInvoice,
}) => {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-red-50 to-rose-50 p-5 rounded-2xl border border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-800 uppercase tracking-widest">
              CREDIT GOVERNANCE
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-red-950 mt-1">
            Publisher Credit Ledger
          </h3>
          <p className="text-xs text-red-800 max-w-xl mt-0.5">
            System automatically places a Publisher on Credit Hold when any invoice exceeds 30 days overdue. The block is lifted automatically when marked paid.
          </p>
        </div>
      </div>

      {/* PC Table of Publisher Clients */}
      <div className="bg-white rounded-2xl shadow-xs border border-green-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h4 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2e7d46]" />
            Registered Publisher Accounts Ledger
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-green-50/60 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-green-100">
              <tr>
                <th className="p-4">Publisher / Business Name</th>
                <th className="p-4">Contact Details</th>
                <th className="p-4">Outstanding Balance</th>
                <th className="p-4">Oldest Overdue Invoice</th>
                <th className="p-4">Credit Governance Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {publishers.map((pub) => {
                const triggeringJob = jobs.find(
                  (j) => j.publisherName === pub.name && j.paymentStatus === "Overdue"
                );

                return (
                  <tr key={pub.id} className="hover:bg-green-50/30 transition-colors">
                    <td className="p-4">
                      <div className="font-extrabold text-gray-900 text-sm">{pub.name}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{pub.location}</div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-gray-800">{pub.contactPerson}</div>
                      <div className="text-gray-500 text-[11px]">{pub.phone}</div>
                    </td>

                    <td className="p-4">
                      <div className="font-mono font-extrabold text-gray-900 text-sm">
                        BDT {pub.outstandingBalanceBdt.toLocaleString()}
                      </div>
                      <div className="text-gray-400 text-[10px]">
                        {pub.totalOrders} total orders placed
                      </div>
                    </td>

                    <td className="p-4">
                      {pub.oldestOverdueDays > 0 ? (
                        <div>
                          <span className="font-bold text-red-600">
                            {pub.oldestOverdueDays} Days Overdue
                          </span>
                          <div className="text-gray-400 text-[10px]">Threshold: 30 days</div>
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-bold">No overdue invoices</span>
                      )}
                    </td>

                    <td className="p-4">
                      {pub.creditHoldStatus ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-700 border border-red-200">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          CREDIT HOLD ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d46]" />
                          ACCOUNT CLEAR
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenContact(pub.name, pub.phone)}
                          className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          title="Call Publisher"
                        >
                          <Phone className="w-4 h-4" />
                        </button>

                        {triggeringJob && (
                          <>
                            <button
                              onClick={() => onOpenInvoice(triggeringJob)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-semibold text-xs hover:bg-blue-100 transition-colors flex items-center gap-1"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              View Unpaid Invoice
                            </button>

                            <button
                              onClick={() => onMarkInvoicePaid(triggeringJob.id)}
                              className="px-3 py-1.5 bg-[#2e7d46] text-white rounded-lg hover:bg-[#256338] font-bold text-xs transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark Paid (Lift Hold)
                            </button>
                          </>
                        )}
                      </div>
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
