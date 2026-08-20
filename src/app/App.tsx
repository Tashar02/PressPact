import React, { useState, useEffect, useMemo } from "react";
import {
  UserRole,
  UserProfile,
  JobOrder,
  FilmStockItem,
  PublisherClient,
  NotificationItem,
} from "./types";
import { supabase } from "./lib/supabase";
import { authService } from "./services/authService";
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
import { DebugOverlay } from "./components/common/DebugOverlay";
import { X, Layers, LayoutDashboard, FileCheck, Calculator, Users, PlusCircle, Receipt, AlertTriangle, Loader2 } from "lucide-react";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("press_owner");
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);

  // App Master Data State
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [stock, setStock] = useState<FilmStockItem[]>([]);
  const [publishers, setPublishers] = useState<PublisherClient[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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

  // 1. Session Restoration & Auth State Change Listener
  useEffect(() => {
    async function restoreSession() {
      try {
        const profile = await authService.getCurrentUser();
        if (profile) {
          setCurrentUser(profile);
          setUserRole(profile.role);
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.info("No active auth session found.");
      } finally {
        setIsCheckingSession(false);
      }
    }

    restoreSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const profile = await authService.getCurrentUser();
        if (profile) {
          setCurrentUser(profile);
          setUserRole(profile.role);
          setIsLoggedIn(true);
        }
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch live master data from Supabase backend on load / login
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [fetchedJobs, fetchedStock, fetchedPublishers, fetchedNotifs] = await Promise.all([
          jobService.fetchJobOrders(),
          stockService.fetchFilmStock(),
          publisherService.fetchPublishers(),
          publisherService.fetchNotifications(),
        ]);

        setJobs(fetchedJobs || []);
        setStock(fetchedStock || []);
        setPublishers(fetchedPublishers || []);
        setNotifications(fetchedNotifs || []);

        // Real-time credit hold: check right now, not on a nightly cron.
        if (fetchedJobs && fetchedPublishers) {
          await checkAndApplyCreditHolds(fetchedJobs, fetchedPublishers);
        }
      } catch (err) {
        console.info("Using local master dataset fallback.");
      }
    }

    loadBackendData();
  }, [isLoggedIn]);

  /**
   * Number of days an invoice is past its due date, measured today.
   * Parses YYYY-MM-DD as a local date so day counts are timezone stable.
   */
  function daysPastDue(invoiceDueDate: string, today: Date): number {
    const due = new Date(`${invoiceDueDate}T00:00:00`);
    if (Number.isNaN(due.getTime())) return 0;
    return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Dynamically calculates whether each publisher should be on credit hold
   * based on whether they have any unpaid invoice whose due date is more than
   * 30 days in the past — checked right now, at load time.
   * Updates the DB and local state only when the status has actually changed.
   */
  async function checkAndApplyCreditHolds(
    currentJobs: JobOrder[],
    currentPublishers: PublisherClient[]
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const pub of currentPublishers) {
      const pubJobs = currentJobs.filter(
        (j) => j.publisherName.toLowerCase() === pub.name.toLowerCase()
      );

      let onHold = false;
      let oldestOverdueDays = 0;
      for (const j of pubJobs) {
        if (j.paymentStatus === "Paid") continue;
        if (!j.invoiceDueDate) continue;
        const overdueDays = daysPastDue(j.invoiceDueDate, today);
        if (overdueDays > 30) {
          onHold = true;
          oldestOverdueDays = Math.max(oldestOverdueDays, overdueDays);
        }
      }

      // Only touch the DB if the state has actually changed
      if (onHold !== pub.creditHoldStatus || oldestOverdueDays !== pub.oldestOverdueDays) {
        setPublishers((prev) =>
          prev.map((p) =>
            p.id === pub.id
              ? { ...p, creditHoldStatus: onHold, oldestOverdueDays }
              : p
          )
        );
        publisherService.setCreditHold(pub.id, onHold, oldestOverdueDays).catch((err) => {
          console.warn("Credit hold auto-sync notice:", err.message || err);
        });
      }
    }
  }


  // Handle Login Success from AuthPages
  const handleLoginSuccess = (profile: UserProfile) => {
    setCurrentUser(profile);
    setUserRole(profile.role);
    setIsLoggedIn(true);
    setActiveTab("dashboard");
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (e) {
      console.warn("Sign out notice:", e);
    }
    setCurrentUser(null);
    setIsLoggedIn(false);
    setActiveTab("dashboard");
  };

  // Toggle Role Action (for testing & demo purposes)
  const handleRoleToggle = () => {
    const nextRole = userRole === "press_owner" ? "publisher" : "press_owner";
    setUserRole(nextRole);
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        role: nextRole,
      });
    }
    setActiveTab("dashboard");
  };

  // Dynamic filter: Users only see jobs matching their respective business name
  const visibleJobs = useMemo(() => {
    if (!currentUser) return [];
    const userBusinessName = currentUser.businessName.toLowerCase();

    if (userRole === "press_owner") {
      // Show only jobs matching this Press Owner's press name
      return jobs.filter(
        (j) => j.pressName.toLowerCase() === userBusinessName
      );
    }

    // Show only jobs matching this Publisher's publisher name
    return jobs.filter(
      (j) => j.publisherName.toLowerCase() === userBusinessName
    );
  }, [jobs, userRole, currentUser]);

  // Dynamic filter: Users only see publishers relevant to their business
  const visiblePublishers = useMemo(() => {
    if (!currentUser) return [];
    const userBusinessName = currentUser.businessName.toLowerCase();

    if (userRole === "press_owner") {
      // If demo seed press Nova Lamination, show all publishers.
      // Otherwise, only show publishers who have placed orders with this specific press.
      if (userBusinessName === "nova lamination") {
        return publishers;
      }
      const relevantPublisherNames = new Set(
        visibleJobs.map((j) => j.publisherName.toLowerCase())
      );
      return publishers.filter((p) => relevantPublisherNames.has(p.name.toLowerCase()));
    }

    // Publisher only sees their own publisher entry
    return publishers.filter(
      (p) => p.name.toLowerCase() === userBusinessName
    );
  }, [publishers, visibleJobs, userRole, currentUser]);

  // Dynamic filter: Users only see notifications related to their own jobs/actions
  const visibleNotifications = useMemo(() => {
    if (!currentUser) return [];
    const userBusinessName = currentUser.businessName.toLowerCase();

    if (userRole === "press_owner") {
      // Press Owner only sees notifications tied to their own jobs or that
      // reference their press or one of their publishers.
      return notifications.filter((n) => {
        if (!n.jobId) {
          const lowerMessage = n.message.toLowerCase();
          const touchesPress = lowerMessage.includes(userBusinessName);
          const touchesClient = visiblePublishers.some((p) =>
            lowerMessage.includes(p.name.toLowerCase())
          );
          return touchesPress || touchesClient;
        }
        const job = jobs.find((j) => j.id === n.jobId);
        return !job || job.pressName.toLowerCase() === userBusinessName;
      });
    }

    // Publisher only sees notifications related to their jobs
    return notifications.filter((n) => {
      if (!n.jobId) {
        // If it's a general notice, only show if it matches their business name
        return n.message.toLowerCase().includes(userBusinessName);
      }
      const job = jobs.find((j) => j.id === n.jobId);
      return job && job.publisherName.toLowerCase() === userBusinessName;
    });
  }, [notifications, jobs, visiblePublishers, userRole, currentUser]);

  // Dynamic Credit Hold Status for logged-in Publisher
  const currentPublisherData = currentUser
    ? publishers.find((p) => p.name.toLowerCase() === currentUser.businessName.toLowerCase())
    : undefined;
  const isCreditHoldActive = currentPublisherData?.creditHoldStatus ?? false;
  // Find the triggering overdue job dynamically: any unpaid invoice 30+ days past due
  const overdueJob = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const job = visibleJobs.find((j) => {
      if (j.paymentStatus === "Paid") return false;
      if (!j.invoiceDueDate) return false;
      return daysPastDue(j.invoiceDueDate, today) > 30;
    });
    if (!job || !job.invoiceDueDate) return null;
    return { ...job, daysOverdue: daysPastDue(job.invoiceDueDate, today) };
  }, [visibleJobs]);

  // Action: Upload Proof Photo
  const handleUploadProof = (jobId: string, photoUrl: string, note: string) => {
    const now = new Date().toISOString().replace("T", " ").slice(0, 16);
    const actorName = `${currentUser?.fullName || "Press Owner"} (Press Owner)`;

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

    // Add Notification (in-memory + persisted)
    const notif = {
      id: `notif-${Date.now()}`,
      timestamp: "Just now",
      title: "Proof Uploaded",
      message: `${currentUser?.businessName || "Press"} uploaded test proof for ${jobId}. Review required.`,
      type: "proof" as const,
      unread: true,
      jobId,
    };
    setNotifications((prev) => [notif, ...prev]);
    publisherService.createNotification(notif).catch(() => {});
  };

  // Action: Approve Proof (Publisher)
  const handleApproveProof = (jobId: string) => {
    const now = new Date().toISOString().replace("T", " ").slice(0, 16);
    const actorName = `${currentUser?.fullName || "Publisher"} (Publisher)`;

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

    const notif = {
      id: `notif-${Date.now()}`,
      timestamp: "Just now",
      title: "Proof Approved ✓",
      message: `Publisher approved proof for ${jobId}. Full run unlocked!`,
      type: "proof" as const,
      unread: true,
      jobId,
    };
    setNotifications((prev) => [notif, ...prev]);
    publisherService.createNotification(notif).catch(() => {});
  };

  // Action: Reject Proof (Publisher)
  const handleRejectProof = (jobId: string, feedbackNote: string) => {
    const now = new Date().toISOString().replace("T", " ").slice(0, 16);
    const actorName = `${currentUser?.fullName || "Publisher"} (Publisher)`;

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

    const notif = {
      id: `notif-${Date.now()}`,
      timestamp: "Just now",
      title: "Proof Rejected ✗",
      message: `Publisher rejected proof for ${jobId}. Note: "${feedbackNote}"`,
      type: "proof" as const,
      unread: true,
      jobId,
    };
    setNotifications((prev) => [notif, ...prev]);
    publisherService.createNotification(notif).catch(() => {});
  };

  // Action: Update Yield & Waste
  const handleUpdateYield = async (
    jobId: string,
    totalIntake: number,
    goodOutput: number,
    wasteCount: number
  ) => {
    const verified = goodOutput + wasteCount === totalIntake;
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          return {
            ...j,
            totalIntake,
            goodOutput,
            wasteCount,
            yieldVerified: verified,
          };
        }
        return j;
      })
    );

    await jobService.verifyYield(jobId, totalIntake, goodOutput, wasteCount, verified);
  };

  // Action: Generate Invoice
  const handleGenerateInvoice = (job: JobOrder, amountBdt: number) => {
    const invoiceId = job.invoiceId || `INV-${new Date().getFullYear()}-${job.id.replace('#ORD-', '')}`;
    // Due date = 30 days from today — needed for real-time credit hold calculation
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const invoiceDueDate = dueDate.toISOString().split("T")[0];

    // Use the freshest job state so the invoice carries the verified yield figures
    const freshJob = jobs.find((j) => j.id === job.id) || job;
    const finalAmount = amountBdt || freshJob.amountBdt || 0;

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === job.id) {
          return {
            ...j,
            status: "Invoiced" as const,
            paymentStatus: j.paymentStatus || ("Unpaid" as const),
            invoiceId,
            amountBdt: finalAmount,
            invoiceDueDate,
          };
        }
        return j;
      })
    );
    setSelectedInvoiceModal({ ...freshJob, status: "Invoiced", invoiceId, amountBdt: finalAmount, invoiceDueDate });

    // Persist invoice to Supabase (including due date)
    jobService.generateInvoice(job.id, invoiceId, finalAmount, invoiceDueDate).catch((err) => {
      console.warn("Invoice generation backend sync notice:", err.message || err);
    });

    // Update publisher outstanding balance
    const matchPub = publishers.find((p) => p.name === job.publisherName);
    if (matchPub) {
      const newBalance = matchPub.outstandingBalanceBdt + finalAmount;
      setPublishers((prev) =>
        prev.map((p) =>
          p.id === matchPub.id ? { ...p, outstandingBalanceBdt: newBalance } : p
        )
      );
      publisherService.updateOutstandingBalance(matchPub.id, newBalance).catch(() => {});
    }

    const notif = {
      id: `notif-${Date.now()}`,
      timestamp: "Just now",
      title: "Invoice Generated",
      message: `Invoice ${invoiceId} for ${job.bookTitle} — ৳${finalAmount.toLocaleString()} BDT. Awaiting payment.`,
      type: "order" as const,
      unread: true,
      jobId: job.id,
    };
    setNotifications((prev) => [notif, ...prev]);
    publisherService.createNotification(notif).catch(() => {});
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

    const updatedJobs = jobs.map((j) =>
      j.id === jobId ? { ...j, paymentStatus: "Paid" as const, daysOverdue: 0 } : j
    );
    setJobs(updatedJobs);

    // Persist payment to Supabase
    jobService.markInvoicePaid(jobId).catch((err) => {
      console.warn("Invoice paid backend sync notice:", err.message || err);
    });

    if (publisherName) {
      const matchPub = publishers.find((p) => p.name === publisherName);
      const wasOnHold = matchPub?.creditHoldStatus ?? false;
      const newBalance = Math.max(
        0,
        (matchPub?.outstandingBalanceBdt ?? 0) - (paidJob?.amountBdt ?? 0)
      );

      setPublishers((prev) =>
        prev.map((p) =>
          p.name === publisherName ? { ...p, outstandingBalanceBdt: newBalance } : p
        )
      );

      if (matchPub) {
        publisherService.updateOutstandingBalance(matchPub.id, newBalance).catch(() => {});
      }

      // Re-run the automatic rule so any remaining overdue invoice keeps the
      // hold in place; the hold only lifts when no overdue invoice is left.
      const updatedPublishers = publishers.map((p) =>
        p.name === publisherName ? { ...p, outstandingBalanceBdt: newBalance } : p
      );
      checkAndApplyCreditHolds(updatedJobs, updatedPublishers);

      // Only notify credit hold lift if publisher was actually on hold
      if (wasOnHold) {
        const holdNotif = {
          id: `notif-${Date.now()}`,
          timestamp: "Just now",
          title: "Credit Hold Lifted ✓",
          message: `Payment received for ${jobId}. Credit Hold on ${publisherName} automatically lifted!`,
          type: "credit" as const,
          unread: true,
        };
        setNotifications((prev) => [holdNotif, ...prev]);
        publisherService.createNotification(holdNotif).catch(() => {});
      } else {
        const paidNotif = {
          id: `notif-${Date.now()}`,
          timestamp: "Just now",
          title: "Payment Received ✓",
          message: `Payment received for invoice on job ${jobId} from ${publisherName}.`,
          type: "credit" as const,
          unread: true,
        };
        setNotifications((prev) => [paidNotif, ...prev]);
        publisherService.createNotification(paidNotif).catch(() => {});
      }
    }
  };

  // Action: Create New Order
  const handleCreateOrder = (newOrd: {
    bookTitle: string;
    coversCount: number;
    laminationType: "Matte 30μm" | "Gloss 24μm" | "Velvet Touch" | "Thermal Matte";
    dueDate: string;
  }) => {
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const id = `#ORD-${ts}-${rand}`;
    const sessionPublisherName = currentUser?.businessName || "Unknown Publisher";
    const sessionPressName = "Nova Lamination";
    const matchPub = publishers.find((p) => p.name === sessionPublisherName);
    const newJob: JobOrder = {
      id,
      bookTitle: newOrd.bookTitle,
      publisherId: matchPub?.id,
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

    // Increment publisher order count
    if (matchPub) {
      setPublishers((prev) =>
        prev.map((p) => p.id === matchPub.id ? { ...p, totalOrders: p.totalOrders + 1 } : p)
      );
      publisherService.incrementPublisherOrder(matchPub.id).catch(() => {});
    }

    const notif = {
      id: `notif-${Date.now()}`,
      timestamp: "Just now",
      title: "New Order Submitted",
      message: `New lamination order ${id} (${newOrd.bookTitle}) placed by ${sessionPublisherName}.`,
      type: "order" as const,
      unread: true,
      jobId: id,
    };
    setNotifications((prev) => [notif, ...prev]);
    publisherService.createNotification(notif).catch(() => {});
  };

  // Initial Session Checking Spinner
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#f1fcf1] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#2e7d46] animate-spin" />
        <p className="text-xs font-bold text-green-950">Initializing PressPact workspace...</p>
      </div>
    );
  }

  // If Not Authenticated, show AuthPages
  if (!isLoggedIn) {
    return <AuthPages onLoginSuccess={handleLoginSuccess} />;
  }

  const pendingProofsCount = visibleJobs.filter((j) => j.status === "Awaiting Proof").length;
  const creditHoldCount = visiblePublishers.filter((p) => p.creditHoldStatus).length;
  const lowStockCount = stock.filter((s) => s.availableMeters <= s.minThresholdMeters).length;

  const tabTitles: Record<string, string> = {
    dashboard: userRole === "press_owner" ? "Active Jobs Pipeline" : "My Orders Overview",
    proofs: userRole === "press_owner" ? "Upload & Manage Proofs" : "Proof Approval Review",
    yield: "Yield & Waste Math Validator",
    stock: "Material Coverage & Inventory",
    clients: "Publisher Client Directory & Credit",
    "new-order": "Place New Lamination Order",
    invoices: "Verified Digital Invoices",
    "credit-status": "Credit Hold Governance Notice",
  };

  return (
    <div className="min-h-screen bg-[#f6fcf6] flex text-gray-900 font-sans antialiased">
      {/* 1. Desktop Sidebar */}
      <DesktopSidebar
        role={userRole}
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingProofsCount={pendingProofsCount}
        creditHoldCount={creditHoldCount}
        lowStockCount={lowStockCount}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          role={userRole}
          currentUser={currentUser}
          onRoleToggle={handleRoleToggle}
          onLogout={handleLogout}
          activeTabTitle={tabTitles[activeTab] || "PressPact Portal"}
          notifications={visibleNotifications}
          onMarkNotificationsRead={() =>
            setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
          }
          onSelectNotificationJob={(jobId) => {
            const match = visibleJobs.find((j) => j.id === jobId);
            if (match) setSelectedJobModal(match);
          }}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {/* PRESS OWNER VIEWS */}
          {userRole === "press_owner" && (
            <>
              {activeTab === "dashboard" && (
                <PressDashboard
                  jobs={visibleJobs}
                  onNavigateTab={setActiveTab}
                  onSelectJob={(job) => setSelectedJobModal(job)}
                  onOpenProof={(job) => {
                    setSelectedProofJob(job);
                    setActiveTab("proofs");
                  }}
                  onOpenYield={(job) => {
                    setSelectedYieldJob(job);
                    setActiveTab("yield");
                  }}
                />
              )}

              {activeTab === "proofs" && (
                <ProofUploadManager
                  jobs={visibleJobs}
                  selectedJob={selectedProofJob}
                  onSelectJob={setSelectedProofJob}
                  onUploadProof={handleUploadProof}
                />
              )}

              {activeTab === "yield" && (
                <YieldValidator
                  jobs={visibleJobs}
                  selectedJob={selectedYieldJob}
                  onSelectJob={setSelectedYieldJob}
                  onVerifyYield={handleUpdateYield}
                  onGenerateInvoice={handleGenerateInvoice}
                />
              )}

              {activeTab === "stock" && (
                <MaterialStockManager stock={stock} jobs={visibleJobs} onAddStock={handleAddStock} />
              )}

              {activeTab === "clients" && (
                <PublisherLedger
                  publishers={visiblePublishers}
                  jobs={visibleJobs}
                  onMarkInvoicePaid={handleMarkInvoicePaid}
                  onOpenContact={(name, phone) =>
                    setContactModalData({ isOpen: true, name, phone })
                  }
                  onOpenInvoice={(job) => setSelectedInvoiceModal(job)}
                />
              )}
            </>
          )}

          {/* PUBLISHER CLIENT VIEWS */}
          {userRole === "publisher" && (
            <>
              {activeTab === "dashboard" && (
                <PublisherDashboard
                  jobs={visibleJobs}
                  isCreditHold={isCreditHoldActive}
                  overdueJob={overdueJob}
                  onNavigateTab={setActiveTab}
                  onSelectJob={(job) => setSelectedJobModal(job)}
                  onOpenProof={(job) => {
                    setSelectedProofJob(job);
                    setActiveTab("proofs");
                  }}
                  onOpenInvoice={(job) => setSelectedInvoiceModal(job)}
                />
              )}

              {activeTab === "new-order" && (
                <NewOrderForm
                  stock={stock}
                  isCreditHold={isCreditHoldActive}
                  onCreateOrder={handleCreateOrder}
                  onOpenCreditHoldNotice={() => setActiveTab("credit-status")}
                  overdueJob={overdueJob}
                />
              )}

              {activeTab === "proofs" && (
                <ProofApprovalGate
                  jobs={visibleJobs}
                  selectedJob={selectedProofJob}
                  onSelectJob={setSelectedProofJob}
                  onApproveProof={handleApproveProof}
                  onRejectProof={handleRejectProof}
                />
              )}

              {activeTab === "invoices" && (
                <VerifiedInvoiceView
                  jobs={visibleJobs.filter((j) => j.status === "Invoiced" || j.status === "Completed")}
                  onOpenInvoice={(job) => setSelectedInvoiceModal(job)}
                />
              )}

              {activeTab === "credit-status" && (
                <CreditHoldBanner
                  overdueJob={overdueJob}
                  onOpenInvoice={(job) => setSelectedInvoiceModal(job)}
                  onOpenContact={() =>
                    setContactModalData({ isOpen: true, name: overdueJob?.pressName })
                  }
                />
              )}
            </>
          )}
        </main>

        {/* Persistent Bottom Mobile Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-green-100 px-2 py-2 flex items-center justify-around z-40 shadow-lg">
          {userRole === "press_owner" ? (
            <>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
                  activeTab === "dashboard" ? "text-[#2e7d46]" : "text-gray-500"
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Jobs</span>
              </button>
              <button
                onClick={() => setActiveTab("proofs")}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
                  activeTab === "proofs" ? "text-[#2e7d46]" : "text-gray-500"
                }`}
              >
                <FileCheck className="w-5 h-5" />
                <span>Proofs</span>
              </button>
              <button
                onClick={() => setActiveTab("yield")}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
                  activeTab === "yield" ? "text-[#2e7d46]" : "text-gray-500"
                }`}
              >
                <Calculator className="w-5 h-5" />
                <span>Yield</span>
              </button>
              <button
                onClick={() => setActiveTab("stock")}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
                  activeTab === "stock" ? "text-[#2e7d46]" : "text-gray-500"
                }`}
              >
                <Layers className="w-5 h-5" />
                <span>Stock</span>
              </button>
              <button
                onClick={() => setActiveTab("clients")}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
                  activeTab === "clients" ? "text-[#2e7d46]" : "text-gray-500"
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Ledger</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
                  activeTab === "dashboard" ? "text-[#2e7d46]" : "text-gray-500"
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Orders</span>
              </button>
              <button
                onClick={() => setActiveTab("new-order")}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
                  activeTab === "new-order" ? "text-[#2e7d46]" : "text-gray-500"
                }`}
              >
                <PlusCircle className="w-5 h-5" />
                <span>New Job</span>
              </button>
              <button
                onClick={() => setActiveTab("proofs")}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
                  activeTab === "proofs" ? "text-[#2e7d46]" : "text-gray-500"
                }`}
              >
                <FileCheck className="w-5 h-5" />
                <span>Review</span>
              </button>
              <button
                onClick={() => setActiveTab("invoices")}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
                  activeTab === "invoices" ? "text-[#2e7d46]" : "text-gray-500"
                }`}
              >
                <Receipt className="w-5 h-5" />
                <span>Invoices</span>
              </button>
              <button
                onClick={() => setActiveTab("credit-status")}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
                  activeTab === "credit-status" ? "text-[#2e7d46]" : "text-gray-500"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
                <span>Status</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Common Modals */}
      {selectedJobModal && (
        <JobDetailsModal
          job={selectedJobModal}
          onClose={() => setSelectedJobModal(null)}
          onOpenProof={(job) => {
            setSelectedProofJob(job);
            setSelectedJobModal(null);
            setActiveTab("proofs");
          }}
          onOpenYield={(job) => {
            setSelectedYieldJob(job);
            setSelectedJobModal(null);
            setActiveTab("yield");
          }}
          onOpenInvoice={(job) => {
            setSelectedJobModal(null);
            setSelectedInvoiceModal(job);
          }}
        />
      )}

      {selectedInvoiceModal && (
        <InvoiceModal
          job={selectedInvoiceModal}
          onClose={() => setSelectedInvoiceModal(null)}
          onMarkPaid={(id) => handleMarkInvoicePaid(id)}
          isPressOwner={userRole === "press_owner"}
        />
      )}

      {contactModalData.isOpen && (
        <ContactModal
          isOpen={contactModalData.isOpen}
          onClose={() => setContactModalData({ isOpen: false })}
          targetName={contactModalData.name || "Contact"}
          phone={contactModalData.phone}
        />
      )}

      {/* Floating Debug overlay logger */}
      <DebugOverlay />
    </div>
  );
}
