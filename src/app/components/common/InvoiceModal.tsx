import React, { useState, useRef } from "react";
import { JobOrder } from "../../types";
import { formatDateBn, formatDateTimeBn } from "../../lib/calc";
import {
  X,
  Printer,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  Smartphone,
  MessageSquare,
  Camera,
  Building2,
  User,
} from "lucide-react";

interface InvoiceModalProps {
  job: JobOrder | null;
  onClose: () => void;
  onMarkPaid?: (jobId: string) => void;
  onSubmitPayment?: (jobId: string, trxId: string, amountBdt: number) => Promise<void>;
  onSendMessage?: (jobId: string, note: string, photoUrl?: string) => Promise<void>;
  onUploadPaymentImage?: (file: File, jobId: string) => Promise<string>;
  isPressOwner?: boolean;
  pressLocation?: string;
  publisherLocation?: string;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  job,
  onClose,
  onMarkPaid,
  onSubmitPayment,
  onSendMessage,
  onUploadPaymentImage,
  isPressOwner = false,
  pressLocation = "",
  publisherLocation = "",
}) => {
  const [trxId, setTrxId] = useState("");
  const [payAmount, setPayAmount] = useState<number>(job?.amountBdt ?? 0);
  const [messageNote, setMessageNote] = useState("");
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [messagePreview, setMessagePreview] = useState<string>("");
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const msgFileInputRef = useRef<HTMLInputElement>(null);

  if (!job) return null;

  const good = job.goodOutput ?? job.coversCount;
  const isPaid = job.paymentStatus === "Paid";
  const isOverdue = job.paymentStatus === "Overdue" || (job.daysOverdue || 0) > 30;
  const hasBkash = Boolean(job.bkashTrxId);

  // Derive line items from the stored invoice total. The invoice total equals
  // good covers x lamination rate, plus good covers x cover rate when the press
  // sourced the covers.
  const coverCost = (job.coverPriceBdt ?? 0) * good;
  const laminationAmount = Math.max(0, (job.amountBdt ?? 0) - coverCost);
  const laminationRate = good > 0 ? laminationAmount / good : 0;
  const printedAt = new Date().toISOString();

  const handlePrint = () => {
    window.print();
  };

  const handleMsgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessageFile(file);
    setMessagePreview(URL.createObjectURL(file));
  };

  const handleSubmitPayment = async () => {
    if (!onSubmitPayment || !trxId.trim()) {
      setErrorText("Enter the bKash transaction ID before submitting.");
      return;
    }
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      setErrorText("Enter the amount you sent via bKash.");
      return;
    }
    setErrorText(null);
    setIsSubmitting(true);
    try {
      await onSubmitPayment(job.id, trxId.trim(), Math.round(payAmount));
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Could not submit payment. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!onSendMessage || !messageNote.trim()) return;
    setErrorText(null);
    setIsSendingMsg(true);
    try {
      let photoUrl: string | undefined;
      if (messageFile && onUploadPaymentImage) {
        photoUrl = await onUploadPaymentImage(messageFile, job.id);
      }
      await onSendMessage(job.id, messageNote.trim(), photoUrl);
      setMessageNote("");
      setMessageFile(null);
      setMessagePreview("");
      setShowMessageBox(false);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Could not send message. Try again.");
    } finally {
      setIsSendingMsg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:bg-white print:p-0 print:items-start print:block">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-green-100 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200 print-invoice print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:p-8">
        {/* Header bar (screen only) */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4 print:hidden">
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

        {/* ===== Printable Invoice Document ===== */}
        <div className="space-y-6">
          {/* Invoice masthead */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-emerald-800 pb-4">
            <div>
              <p className="text-2xl font-black tracking-tight text-emerald-900">INVOICE</p>
              <p className="text-[11px] text-gray-500">
                Printed on {formatDateTimeBn(printedAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-black text-gray-900 text-base">
                Invoice #{job.invoiceId || `INV-${job.id.replace("#", "")}`}
              </p>
              <p className="text-[11px] text-gray-500">Order {job.id}</p>
              <p
                className={`text-[11px] font-bold mt-0.5 ${
                  isPaid ? "text-emerald-700" : isOverdue ? "text-red-700" : "text-amber-700"
                }`}
              >
                {isPaid ? "PAID" : job.paymentStatus || "Unpaid"}
              </p>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                <Building2 className="w-3.5 h-3.5" /> Issued By (Press)
              </p>
              <p className="font-bold text-green-950 text-sm">{job.pressName}</p>
              {job.pressOwnerName && <p className="text-gray-700">{job.pressOwnerName}</p>}
              <p className="text-gray-500">{pressLocation || "Dhaka, Bangladesh"}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                <User className="w-3.5 h-3.5" /> Billed To (Publisher)
              </p>
              <p className="font-bold text-green-950 text-sm">{job.publisherName}</p>
              <p className="text-gray-500">{publisherLocation || "Dhaka, Bangladesh"}</p>
            </div>
          </div>

          {/* Order information */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Book Title:</span>
              <span className="font-bold text-gray-900">{job.bookTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Order ID:</span>
              <span className="font-mono font-bold text-gray-900">{job.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Order Date:</span>
              <span className="font-bold text-gray-900">
                {formatDateTimeBn(job.createdAt || job.orderDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Lamination Finish:</span>
              <span className="font-bold text-emerald-800">{job.laminationType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cover Supply:</span>
              <span className="font-bold text-gray-900">
                {job.coverSupply === "press_purchased"
                  ? `Press purchased (${job.coverType || "—"})`
                  : "Client supplied"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery Due:</span>
              <span className="font-bold text-amber-700">{formatDateBn(job.dueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice Due Date:</span>
              <span className="font-bold text-gray-900">
                {formatDateBn(job.invoiceDueDate || "") || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Billed Covers:</span>
              <span className="font-mono font-bold text-gray-900">{good.toLocaleString()}</span>
            </div>
          </div>

          {/* Itemized costs */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Costs</p>
            <table className="w-full text-xs text-left border border-gray-100 rounded-xl overflow-hidden">
              <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3 text-right">Rate (BDT)</th>
                  <th className="p-3 text-right">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-3">
                    <p className="font-bold text-gray-900">Lamination Service</p>
                    <p className="text-[10px] text-gray-400">{job.laminationType}</p>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-gray-800">
                    {good.toLocaleString()} covers
                  </td>
                  <td className="p-3 text-right font-mono text-gray-700">
                    {laminationRate > 0 ? laminationRate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-gray-900">
                    {Math.round(laminationAmount).toLocaleString()}
                  </td>
                </tr>
                {coverCost > 0 && (
                  <tr>
                    <td className="p-3">
                      <p className="font-bold text-gray-900">Cover Supply</p>
                      <p className="text-[10px] text-gray-400">{job.coverType || "Covers sourced by press"}</p>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-gray-800">
                      {good.toLocaleString()} covers
                    </td>
                    <td className="p-3 text-right font-mono text-gray-700">
                      {(job.coverPriceBdt ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-gray-900">
                      {Math.round(coverCost).toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total & due date */}
          <div className="flex items-center justify-between p-4 bg-gray-900 text-white rounded-xl print:bg-gray-900">
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Amount Due</p>
              <p className="text-2xl font-black text-emerald-400">
                BDT {(job.amountBdt ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Due Date</p>
              <p className={`text-sm font-bold ${isOverdue && !isPaid ? "text-red-400" : "text-white"}`}>
                {formatDateBn(job.invoiceDueDate || "") || "—"}
              </p>
            </div>
          </div>

          {/* Autogenerated note — bottom center */}
          <div className="text-center pt-2">
            <p className="text-[11px] text-gray-500 font-medium">
              This is an autogenerated invoice. Manual signature verification is not required.
            </p>
          </div>
        </div>

        {/* ===== Payment Flow (screen only) ===== */}
        <div className="print:hidden">
          {!isPaid ? (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              {isPressOwner ? (
                <>
                  {hasBkash && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-extrabold text-blue-900">
                        <Smartphone className="w-4 h-4" />
                        Client bKash Payment Submitted
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Transaction ID:</span>
                        <span className="font-mono font-bold text-gray-900">{job.bkashTrxId}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Amount Sent:</span>
                        <span className="font-mono font-bold text-gray-900">
                          BDT {job.bkashAmount?.toLocaleString() ?? "—"}
                        </span>
                      </div>
                      {job.paymentSubmittedAt && (
                        <div className="flex justify-between text-gray-700">
                          <span>Submitted:</span>
                          <span className="font-mono font-bold text-gray-900">
                            {formatDateTimeBn(job.paymentSubmittedAt)}
                          </span>
                        </div>
                      )}
                      <p className="text-[11px] text-blue-800">
                        Verify the transaction in your bKash merchant account before confirming receipt. If the amount you actually received does not match the invoice, ask the client about the difference.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <button
                          onClick={() => {
                            onMarkPaid?.(job.id);
                            onClose();
                          }}
                          className="flex-1 py-2.5 px-4 bg-[#2e7d46] text-white font-semibold text-xs rounded-xl hover:bg-[#256338] transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Confirm Received — Mark Paid
                        </button>
                        <button
                          onClick={() => setShowMessageBox(!showMessageBox)}
                          className="flex-1 py-2.5 px-4 bg-white border border-blue-400 text-blue-800 font-semibold text-xs rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Ask Client About Issue
                        </button>
                      </div>

                      {showMessageBox && (
                        <div className="space-y-2 pt-1">
                          <textarea
                            rows={2}
                            value={messageNote}
                            onChange={(e) => setMessageNote(e.target.value)}
                            placeholder="e.g. The amount received is BDT 5,000 less than the invoice. Please send the remaining amount."
                            className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="file"
                            ref={msgFileInputRef}
                            onChange={handleMsgFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                          {messagePreview ? (
                            <div className="relative inline-block">
                              <img
                                src={messagePreview}
                                alt="Payment proof screenshot"
                                className="h-24 w-32 object-cover rounded-lg border border-blue-200"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setMessageFile(null);
                                  setMessagePreview("");
                                }}
                                className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-600 text-white"
                                title="Remove screenshot"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => msgFileInputRef.current?.click()}
                              className="text-[11px] text-blue-700 font-bold flex items-center gap-1.5 hover:underline"
                            >
                              <Camera className="w-3.5 h-3.5" /> Attach screenshot (optional)
                            </button>
                          )}
                          <button
                            onClick={handleSendMessage}
                            disabled={isSendingMsg || !messageNote.trim()}
                            className="py-2 px-3 bg-blue-700 text-white font-bold text-xs rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-1.5"
                          >
                            {isSendingMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Send Message to Client
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {onMarkPaid && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 text-xs space-y-2">
                      <p className="text-amber-900 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                        Two-step payment guard: for bKash, always review the client&apos;s transaction above and click &quot;Confirm Received — Mark Paid&quot;. Only use the manual button below if payment was received outside bKash (cash / bank / cheque).
                      </p>
                      <button
                        onClick={() => {
                          onMarkPaid?.(job.id);
                          onClose();
                        }}
                        className="w-full py-2.5 px-4 bg-white border-2 border-amber-500 text-amber-800 font-semibold text-xs rounded-xl hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark Paid Manually (Offline Payment)
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {hasBkash ? (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-extrabold text-blue-900">
                        <CheckCircle2 className="w-4 h-4" />
                        bKash Payment Submitted
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Transaction ID:</span>
                        <span className="font-mono font-bold text-gray-900">{job.bkashTrxId}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Amount Sent:</span>
                        <span className="font-mono font-bold text-gray-900">
                          BDT {job.bkashAmount?.toLocaleString() ?? "—"}
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-800">
                        Awaiting press confirmation. Once {job.pressName} verifies the transaction, your invoice will be marked Paid and any credit hold will lift automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-3">
                      <div className="flex items-center gap-2 font-extrabold text-emerald-900">
                        <Smartphone className="w-4 h-4" />
                        Pay Invoice via bKash
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Send BDT {job.amountBdt?.toLocaleString() ?? "—"} to {job.pressName}&apos;s bKash merchant number, then submit your transaction details below. The press verifies the payment before marking the invoice paid.
                      </p>
                      <div className="space-y-2 pt-1">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                            bKash Transaction ID
                          </label>
                          <input
                            type="text"
                            value={trxId}
                            onChange={(e) => setTrxId(e.target.value)}
                            placeholder="e.g. 9HGK2J3M4N"
                            className="w-full p-2.5 bg-white border border-emerald-200 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                            Amount Sent (BDT)
                          </label>
                          <input
                            type="number"
                            value={payAmount}
                            min={1}
                            onChange={(e) => setPayAmount(Number(e.target.value))}
                            className="w-full p-2.5 bg-white border border-emerald-200 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                          />
                        </div>
                        <button
                          onClick={handleSubmitPayment}
                          disabled={isSubmitting}
                          className="w-full py-2.5 px-4 bg-[#2e7d46] text-white font-bold text-xs rounded-xl hover:bg-[#256338] transition-colors flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Submit bKash Payment Info
                        </button>
                        <p className="text-[10px] text-gray-500">
                          Can&apos;t pay by bKash? Settle with {job.pressName} directly — the press can mark the invoice paid manually.
                        </p>
                      </div>
                    </div>
                  )}

                  {job.paymentNote && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <span>
                          <strong>Message from {job.pressName}:</strong> &quot;{job.paymentNote}&quot;
                        </span>
                        {job.paymentNotePhotoUrl && (
                          <div>
                            <img
                              src={job.paymentNotePhotoUrl}
                              alt="Screenshot attached by the press"
                              className="max-h-48 rounded-lg border border-amber-200"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {errorText && (
                <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded-xl font-semibold text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  {errorText}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 print:hidden">
              <CheckCircle2 className="w-5 h-5 text-[#2e7d46] shrink-0" />
              <span>This invoice has been paid{job.bkashTrxId ? ` via bKash (TRX ${job.bkashTrxId})` : ""}. Credit hold automatically lifted.</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2 print:hidden">
            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-gray-100 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};