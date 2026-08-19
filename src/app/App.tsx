import React, { useState, useEffect } from "react";
import {
  UserRole,
  JobOrder,
  FilmStockItem,
  PublisherClient,
  NotificationItem,
} from "./types";
import {
  INITIAL_JOBS,
  INITIAL_STOCK,
  INITIAL_PUBLISHERS,
  INITIAL_NOTIFICATIONS,
} from "./mockData";
import { jobService } from "./services/jobService";
import { stockService } from "./services/stockService";
import { publisherService } from "./services/publisherService";
import { DesktopSidebar } from "./components/layout/DesktopSidebar";
import { TopHeader } from "./components/layout/TopHeader";
import { AuthPages } from "./components/auth/AuthPages";
import { PressDashboard } from "./components/press/PressDashboard";
import { ProofUploadManager } from "./components/press/ProofUploadManager";
import { YieldValidator } from "./components/press/YieldValidator";
import { MaterialStockManager } from "./components/press/MaterialStockManager";
import { PublisherLedger } from "./components/press/PublisherLedger";

import { PublisherDashboard } from "./components/publisher/PublisherDashboard";
import { NewOrderForm } from "./components/publisher/NewOrderForm";
import { ProofApprovalGate } from "./components/publisher/ProofApprovalGate";
import { VerifiedInvoiceView } from "./components/publisher/VerifiedInvoiceView";
import { CreditHoldBanner } from "./components/publisher/CreditHoldBanner";

import { JobDetailsModal } from "./components/common/JobDetailsModal";
import { ContactModal } from "./components/common/ContactModal";
import { InvoiceModal } from "./components/common/InvoiceModal";
import { X, Layers, LayoutDashboard, FileCheck, Calculator, Users, PlusCircle, Receipt, AlertTriangle } from "lucide-react";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>("press_owner");
  const [activeTab, setActiveTab] = useState("dashboard");

  // App Master Data State
  const [jobs, setJobs] = useState<JobOrder[]>(INITIAL_JOBS);
  const [stock, setStock] = useState<FilmStockItem[]>(INITIAL_STOCK);
  const [publishers, setPublishers] = useState<PublisherClient[]>(INITIAL_PUBLISHERS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch live master data from Supabase backend on load
  useEffect(() => {
    async function loadBackendData() {
      setIsLoading(true);
      try {
        const [fetchedJobs, fetchedStock, fetchedPublishers, fetchedNotifs] = await Promise.all([
          jobService.fetchJobOrders(),
          stockService.fetchFilmStock(),
          publisherService.fetchPublishers(),
          publisherService.fetchNotifications(),
        ]);

        if (fetchedJobs && fetchedJobs.length > 0) setJobs(fetchedJobs);
        if (fetchedStock && fetchedStock.length > 0) setStock(fetchedStock);
        if (fetchedPublishers && fetchedPublishers.length > 0) setPublishers(fetchedPublishers);
        if (fetchedNotifs && fetchedNotifs.length > 0) setNotifications(fetchedNotifs);
      } catch (err) {
        console.info("Using local master dataset until Supabase credentials are plugged in.");
      } finally {
        setIsLoading(false);
      }
    }

    loadBackendData();
  }, []);

  // Selected State for Modals
  const [selectedJobModal, setSelectedJobModal] = useState<JobOrder | null>(null);
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState<JobOrder | null>(null);
  const [contactModalData, setContactModalData] = useState<{
    isOpen: boolean;
    name?: string;
    phone?: string;
  }>({ isOpen: false });

  const [selectedProofJob, setSelectedProofJob] = useState<JobOrder | null>(null);
  const [selectedYieldJob, setSelectedYieldJob] = useState<JobOrder | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if Publisher client is on Credit Hold
  const sagoricaPub = publishers.find((p) => p.name === "Sagorica Publications");
  const isCreditHoldActive = sagoricaPub ? sagoricaPub.creditHoldStatus : false;
  const overdueJob = jobs.find(
    (j) => j.publisherName === "Sagorica Publications" && j.paymentStatus === "Overdue"
  ) || null;

  // Track specific publisher contact (Shahin vs Chinu)
  const [publisherContact, setPublisherContact] = useState<"Shahin Ahmed Mithu" | "Abu Sayed Chinu">("Shahin Ahmed Mithu");

  // Toggle Role Action
  const handleRoleToggle = () => {
    const nextRole = userRole === "press_owner" ? "publisher" : "press_owner";
    setUserRole(nextRole);
    setActiveTab("dashboard");
  };

  // Action: Upload Proof Photo
  const handleUploadProof = (jobId: string, photoUrl: string, note: string) => {
    const now = new Date().toISOString().replace("T", " ").slice(0, 16);
    const actorName = "Md. Abdur Rahim (Press Owner)";

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          const newLog = {
            id: `log-${Date.now()}`,
            timestamp: now,
            action: "uploaded" as const,
            actor: actorName,
            role: "press_owner" as const,
            note: note,
            photoUrl: photoUrl,
          };
          return {
            ...j,
            status: "Awaiting Proof" as const,
            proofPhotoUrl: photoUrl,
            proofNote: note,
            proofLogs: [newLog, ...(j.proofLogs || [])],
          };
        }
        return j;
      })
    );

    // Sync to Supabase
    jobService.uploadProof(jobId, photoUrl, note, actorName).catch((err) => {
      console.warn("Proof upload backend sync notice:", err.message || err);
    });

    // Add Notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: "Just now",
        title: "Proof Uploaded",
        message: `Nova Lamination uploaded test proof for ${jobId}. Review required.`,
        type: "proof",
        unread: true,
        jobId,
      },
      ...prev,
    ]);
  };

  // Action: Approve Proof (Publisher)
  const handleApproveProof = (jobId: string) => {
    const now = new Date().toISOString().replace("T", " ").slice(0, 16);
    const actorName = `${publisherContact} (Publisher)`;

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          const newLog = {
            id: `log-${Date.now()}`,
            timestamp: now,
            action: "approved" as const,
            actor: actorName,
            role: "publisher" as const,
            note: "Approved for full production run.",
          };
          return {
            ...j,
            status: "In Production" as const,
            proofLogs: [newLog, ...(j.proofLogs || [])],
          };
        }
        return j;
      })
    );

    // Sync to Supabase
    jobService.approveProof(jobId, actorName).catch((err) => {
      console.warn("Proof approval backend sync notice:", err.message || err);
    });

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: "Just now",
        title: "Proof Approved ✓",
        message: `Publisher approved proof for ${jobId}. Full run unlocked!`,
        type: "proof",
        unread: true,
        jobId,
      },
      ...prev,
    ]);
  };

  // Action: Reject Proof (Publisher)
  const handleRejectProof = (jobId: string, feedbackNote: string) => {
    const now = new Date().toISOString().replace("T", " ").slice(0, 16);
    const actorName = `${publisherContact} (Publisher)`;

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          const newLog = {
            id: `log-${Date.now()}`,
            timestamp: now,
            action: "rejected" as const,
            actor: actorName,
            role: "publisher" as const,
            note: feedbackNote,
          };
          return {
            ...j,
            status: "Proof Rejected" as const,
            proofLogs: [newLog, ...(j.proofLogs || [])],
          };
        }
        return j;
      })
    );

    // Sync to Supabase
    jobService.rejectProof(jobId, actorName, feedbackNote).catch((err) => {
      console.warn("Proof rejection backend sync notice:", err.message || err);
    });

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: "Just now",
        title: "Proof Rejected ✗",
        message: `Publisher rejected proof for ${jobId}. Note: "${feedbackNote}"`,
        type: "proof",
        unread: true,
        jobId,
      },
      ...prev,
    ]);
  };

  // Action: Update Yield & Waste
  const handleUpdateYield = (
    jobId: string,
    totalIntake: number,
    goodOutput: number,
    wasteCount: number
  ) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          return {
            ...j,
            totalIntake,
            goodOutput,
            wasteCount,
            yieldVerified: goodOutput + wasteCount === totalIntake,
          };
        }
        return j;
      })
    );

    // Sync to Supabase
    if (goodOutput + wasteCount === totalIntake) {
      jobService.verifyYield(jobId, totalIntake, goodOutput, wasteCount).catch((err) => {
        console.warn("Yield verification backend sync notice:", err.message || err);
      });
    }
  };

  // Action: Generate Invoice
  const handleGenerateInvoice = (job: JobOrder) => {
    const invoiceId = job.invoiceId || `INV-${new Date().getFullYear()}-${job.id.replace('#ORD-', '')}`;
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === job.id) {
          return {
            ...j,
            status: "Invoiced" as const,
            paymentStatus: j.paymentStatus || ("Unpaid" as const),
            invoiceId,
          };
        }
        return j;
      })
    );
    setSelectedInvoiceModal({ ...job, status: "Invoiced", invoiceId });
  };

  // Action: Add Stock
  const handleAddStock = (type: string, meters: number) => {
    setStock((prev) =>
      prev.map((s) => (s.type === type ? { ...s, availableMeters: s.availableMeters + meters } : s))
    );

    const matchItem = stock.find((s) => s.type === type);
    if (matchItem) {
      stockService.restockItem(matchItem.id, meters).catch((err) => {
        console.warn("Stock restock backend sync notice:", err.message || err);
      });
    }
  };

  // Action: Mark Invoice Paid (Lift Credit Hold automatically - FR-4.4)
  const handleMarkInvoicePaid = (jobId: string) => {
    const paidJob = jobs.find((j) => j.id === jobId);
    const publisherName = paidJob?.publisherName;

    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, paymentStatus: "Paid" as const, daysOverdue: 0 } : j))
    );

    if (publisherName) {
      setPublishers((prev) =>
        prev.map((p) =>
          p.name === publisherName
            ? { ...p, creditHoldStatus: false, oldestOverdueDays: 0 }
            : p
        )
      );

      const matchPub = publishers.find((p) => p.name === publisherName);
      if (matchPub) {
        publisherService.setCreditHold(matchPub.id, false).catch((err) => {
          console.warn("Credit hold lift backend sync notice:", err.message || err);
        });
      }
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: "Just now",
        title: "Credit Hold Lifted ✓",
        message: `Payment received for ${jobId}. Credit Hold on ${publisherName ?? "publisher"} automatically lifted!`,
        type: "credit",
        unread: true,
      },
      ...prev,
    ]);
  };


  const handleCreateOrder = (newOrd: {
    bookTitle: string;
    coversCount: number;
    laminationType: "Matte 30μm" | "Gloss 24μm" | "Velvet Touch" | "Thermal Matte";
    dueDate: string;
  }) => {
    const id = `#ORD-0${jobs.length + 10}`;
    const sessionPublisherName = "Sagorica Publications";
    const sessionPressName = "Nova Lamination";
    const newJob: JobOrder = {
      id,
      bookTitle: newOrd.bookTitle,
      publisherName: sessionPublisherName,
      pressName: sessionPressName,
      coversCount: newOrd.coversCount,
      laminationType: newOrd.laminationType,
      dueDate: newOrd.dueDate,
      orderDate: new Date().toISOString().split("T")[0],
      status: "Order Placed",
      estimatedFilmMeters: Math.round(newOrd.coversCount * 0.7),
      proofLogs: [],
    };

    setJobs((prev) => [newJob, ...prev]);

    // Sync to Supabase
    jobService.createJobOrder(newJob).catch((err) => {
      console.warn("New order backend creation notice:", err.message || err);
    });
    stockService.deductStock(newOrd.laminationType, newJob.estimatedFilmMeters).catch((err) => {
      console.warn("Stock deduction backend sync notice:", err.message || err);
    });

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: "Just now",
        title: "New Order Submitted",
        message: `New lamination order ${id} (${newOrd.bookTitle}) placed by ${sessionPublisherName}.`,
        type: "order",
        unread: true,
        jobId: id,
      },
      ...prev,
    ]);
  };


  if (!isLoggedIn) {
    return <AuthPages onLoginSuccess={(role) => { setUserRole(role); setIsLoggedIn(true); }} />;
  }

  const pendingProofsCount = jobs.filter((j) => j.status === "Awaiting Proof").length;
  const creditHoldCount = publishers.filter((p) => p.creditHoldStatus).length;
  const lowStockCount = stock.filter((s) => s.availableMeters <= s.minThresholdMeters).length;

  const tabTitles: Record<string, string> = {
    dashboard: userRole === "press_owner" ? "Active Jobs Pipeline" : "My Orders Overview",
    proofs: userRole === "press_owner" ? "Proof Approval Management" : "Proof Approval Center",
    yield: "Yield & Waste Math Validator",
    stock: "Material Coverage & Stock Calculator",
    clients: "Publisher Accounts & Credit Ledger",
    "new-order": "Submit New Lamination Order",
    invoices: "Verified Yield Invoices",
    "credit-status": "Credit & Account Governance Status",
  };

  const isPress = userRole === "press_owner";

  return (
    <div className="flex h-screen bg-[#f1fcf1] overflow-hidden text-gray-900 font-sans">
      {/* Desktop PC Sidebar */}
      <DesktopSidebar
        role={userRole}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingProofsCount={pendingProofsCount}
        creditHoldCount={creditHoldCount}
        lowStockCount={lowStockCount}
        onLogout={() => setIsLoggedIn(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopHeader
          role={userRole}
          onRoleToggle={handleRoleToggle}
          activeTabTitle={tabTitles[activeTab] || "Dashboard"}
          notifications={notifications}
          onMarkNotificationsRead={() =>
            setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
          }
          onSelectNotificationJob={(jobId) => {
            const found = jobs.find((j) => j.id === jobId);
            if (found) setSelectedJobModal(found);
          }}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Press Owner Views */}
            {isPress && activeTab === "dashboard" && (
              <PressDashboard
                jobs={jobs}
                onSelectJob={setSelectedJobModal}
                onOpenProof={(job) => { setSelectedProofJob(job); setActiveTab("proofs"); }}
                onOpenYield={(job) => { setSelectedYieldJob(job); setActiveTab("yield"); }}
                onNavigateTab={setActiveTab}
              />
            )}

            {isPress && activeTab === "proofs" && (
              <ProofUploadManager
                jobs={jobs}
                selectedJob={selectedProofJob}
                onSelectJob={setSelectedProofJob}
                onUploadProof={handleUploadProof}
              />
            )}

            {isPress && activeTab === "yield" && (
              <YieldValidator
                jobs={jobs}
                selectedJob={selectedYieldJob}
                onSelectJob={setSelectedYieldJob}
                onUpdateYield={handleUpdateYield}
                onGenerateInvoice={handleGenerateInvoice}
              />
            )}

            {isPress && activeTab === "stock" && (
              <MaterialStockManager stock={stock} jobs={jobs} onAddStock={handleAddStock} />
            )}

            {isPress && activeTab === "clients" && (
              <PublisherLedger
                publishers={publishers}
                jobs={jobs}
                onMarkInvoicePaid={handleMarkInvoicePaid}
                onOpenContact={(name, phone) => setContactModalData({ isOpen: true, name, phone })}
                onOpenInvoice={setSelectedInvoiceModal}
              />
            )}

            {/* Publisher Client Views */}
            {!isPress && activeTab === "dashboard" && (
              <PublisherDashboard
                jobs={jobs}
                isCreditHold={isCreditHoldActive}
                overdueJob={overdueJob}
                onNavigateTab={setActiveTab}
                onSelectJob={setSelectedJobModal}
                onOpenProof={(job) => { setSelectedProofJob(job); setActiveTab("proofs"); }}
                onOpenInvoice={setSelectedInvoiceModal}
              />
            )}

            {!isPress && activeTab === "new-order" && (
              <NewOrderForm
                stock={stock}
                isCreditHold={isCreditHoldActive}
                overdueJob={overdueJob}
                onCreateOrder={handleCreateOrder}
                onOpenCreditHoldNotice={() => setActiveTab("credit-status")}
              />
            )}

            {!isPress && activeTab === "proofs" && (
              <ProofApprovalGate
                jobs={jobs}
                selectedJob={selectedProofJob}
                onSelectJob={setSelectedProofJob}
                onApproveProof={handleApproveProof}
                onRejectProof={handleRejectProof}
              />
            )}

            {!isPress && activeTab === "invoices" && (
              <VerifiedInvoiceView jobs={jobs} onOpenInvoice={setSelectedInvoiceModal} />
            )}

            {!isPress && activeTab === "credit-status" && (
              <CreditHoldBanner
                overdueJob={overdueJob}
                onOpenInvoice={setSelectedInvoiceModal}
                onOpenContact={() =>
                  setContactModalData({
                    isOpen: true,
                    name: overdueJob
                      ? `${overdueJob.pressName}${overdueJob.pressOwnerName ? ` (${overdueJob.pressOwnerName})` : ""}`
                      : "Press Owner",
                    phone: "+880 1711-456789",
                  })
                }
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Interactive Modals */}
      <JobDetailsModal
        job={selectedJobModal}
        onClose={() => setSelectedJobModal(null)}
        onOpenProof={(j) => { setSelectedProofJob(j); setActiveTab("proofs"); }}
        onOpenYield={isPress ? (j) => { setSelectedYieldJob(j); setActiveTab("yield"); } : undefined}
        onOpenInvoice={setSelectedInvoiceModal}
      />

      <InvoiceModal
        job={selectedInvoiceModal}
        onClose={() => setSelectedInvoiceModal(null)}
        onMarkPaid={handleMarkInvoicePaid}
        isPressOwner={isPress}
      />

      <ContactModal
        isOpen={contactModalData.isOpen}
        onClose={() => setContactModalData({ isOpen: false })}
        targetName={contactModalData.name}
        phone={contactModalData.phone}
      />
    </div>
  );
}
