import React, { useState, useEffect, useMemo } from "react";
import {
  UserRole,
  UserProfile,
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
  const [jobs, setJobs] = useState<JobOrder[]>(INITIAL_JOBS);
  const [stock, setStock] = useState<FilmStockItem[]>(INITIAL_STOCK);
  const [publishers, setPublishers] = useState<PublisherClient[]>(INITIAL_PUBLISHERS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

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
        if (fetchedStock && fetchedStock.length > 0) setStock(fetchedStock);
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
   * Dynamically calculates whether each publisher should be on credit hold
   * based on whether they have any Unpaid invoice whose due date is more than
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
      const hasOverdueInvoice = currentJobs.some((j) => {
        if (j.publisherName.toLowerCase() !== pub.name.toLowerCase()) return false;
        if (j.paymentStatus !== "Unpaid") return false;
        if (!j.invoiceDueDate) return false;
        const due = new Date(j.invoiceDueDate);
        const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 30;
      });

      // Only touch the DB if the status has actually changed
      if (hasOverdueInvoice !== pub.creditHoldStatus) {
        setPublishers((prev) =>
          prev.map((p) =>
            p.id === pub.id ? { ...p, creditHoldStatus: hasOverdueInvoice } : p
          )
        );
        publisherService.setCreditHold(pub.id, hasOverdueInvoice).catch((err) => {
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
        businessName: nextRole === "press_owner" ? "Nova Lamination" : "Sagorica Publications",
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

  // Dynamic filter: Users only see notifications related to their own jobs/actions
  const visibleNotifications = useMemo(() => {
    if (!currentUser) return [];
    const userBusinessName = currentUser.businessName.toLowerCase();

    if (userRole === "press_owner") {
      // Press Owner sees all notifications or those related to their jobs
      return notifications.filter((n) => {
        if (!n.jobId) return true; // General stock / system notifications
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
  }, [notifications, jobs, userRole, currentUser]);

  // Dynamic Credit Hold Status for logged-in Publisher
  const currentPublisherData = currentUser
    ? publishers.find((p) => p.name.toLowerCase() === currentUser.businessName.toLowerCase())
    : undefined;
  const isCreditHoldActive = currentPublisherData?.creditHoldStatus ?? false;
  // Find the triggering overdue job dynamically: unpaid, has a due date, and is 30+ days past it
  const overdueJob = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return visibleJobs.find((j) => {
      if (j.paymentStatus !== "Unpaid") return false;
      if (!j.invoiceDueDate) return false;
      const due = new Date(j.invoiceDueDate);
      const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 30;
    }) || null;
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

    if (goodOutput + wasteCount === totalIntake) {
      jobService.verifyYield(jobId, totalIntake, goodOutput, wasteCount).catch((err) => {
        console.warn("Yield verification backend sync notice:", err.message || err);
      });
    }
  };

  // Action: Generate Invoice
  const handleGenerateInvoice = (job: JobOrder) => {
    const invoiceId = job.invoiceId || `INV-${new Date().getFullYear()}-${job.id.replace('#ORD-', '')}`;
    const amountBdt = job.amountBdt ?? Math.round(job.coversCount * 12);
    // Due date = 30 days from today — needed for real-time credit hold calculation
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const invoiceDueDate = dueDate.toISOString().split("T")[0];

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === job.id) {
          return {
            ...j,
            status: "Invoiced" as const,
            paymentStatus: j.paymentStatus || ("Unpaid" as const),
            invoiceId,
            amountBdt,
            invoiceDueDate,
          };
        }
        return j;
      })
    );
    setSelectedInvoiceModal({ ...job, status: "Invoiced", invoiceId, amountBdt, invoiceDueDate });

    // Persist invoice to Supabase (including due date)
    jobService.generateInvoice(job.id, invoiceId, amountBdt, invoiceDueDate).catch((err) => {
      console.warn("Invoice generation backend sync notice:", err.message || err);
    });

    // Update publisher outstanding balance
    const matchPub = publishers.find((p) => p.name === job.publisherName);
    if (matchPub) {
      const newBalance = matchPub.outstandingBalanceBdt + amountBdt;
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
      message: `Invoice ${invoiceId} for ${job.bookTitle} — ৳${amountBdt.toLocaleString()} BDT. Awaiting payment.`,
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

    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, paymentStatus: "Paid" as const, daysOverdue: 0 } : j))
    );

    // Persist payment to Supabase
    jobService.markInvoicePaid(jobId).catch((err) => {
      console.warn("Invoice paid backend sync notice:", err.message || err);
    });

    if (publisherName) {
      const matchPub = publishers.find((p) => p.name === publisherName);
      const wasOnHold = matchPub?.creditHoldStatus ?? false;

      setPublishers((prev) =>
        prev.map((p) =>
          p.name === publisherName
            ? { ...p, creditHoldStatus: false, oldestOverdueDays: 0, outstandingBalanceBdt: Math.max(0, p.outstandingBalanceBdt - (paidJob?.amountBdt ?? 0)) }
            : p
        )
      );

      if (matchPub) {
        publisherService.setCreditHold(matchPub.id, false).catch((err) => {
          console.warn("Credit hold lift backend sync notice:", err.message || err);
        });
        // Update outstanding balance
        const newBalance = Math.max(0, matchPub.outstandingBalanceBdt - (paidJob?.amountBdt ?? 0));
        publisherService.updateOutstandingBalance(matchPub.id, newBalance).catch(() => {});
      }

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
    const newJob: JobOrder = {
      id,
      bookTitle: newOrd.bookTitle,
      publisherName: sessionPublisherName,
      pressName: sessionPressName,
      pressOwnerName: "Md. Abdur Rahim",
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
    const matchPub = publishers.find((p) => p.name === sessionPublisherName);
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
  const creditHoldCount = publishers.filter((p) => p.creditHoldStatus).length;
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
            const match = jobs.find((j) => j.id === jobId);
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
                  jobs={jobs}
                  stock={stock}
                  publishers={publishers}
                  onNavigateTab={setActiveTab}
                  onSelectJob={(job) => setSelectedJobModal(job)}
                  onOpenProofUpload={(job) => {
                    setSelectedProofJob(job);
                    setActiveTab("proofs");
                  }}
                  onOpenYieldAudit={(job) => {
                    setSelectedYieldJob(job);
                    setActiveTab("yield");
                  }}
                  onOpenInvoice={(job) => handleGenerateInvoice(job)}
                  onContactPublisher={(name, phone) =>
                    setContactModalData({ isOpen: true, name, phone })
                  }
                />
              )}

              {activeTab === "proofs" && (
                <ProofUploadManager
                  jobs={jobs}
                  selectedJob={selectedProofJob}
                  onSelectJob={setSelectedProofJob}
                  onUploadProof={handleUploadProof}
                />
              )}

              {activeTab === "yield" && (
                <YieldValidator
                  jobs={jobs}
                  selectedJob={selectedYieldJob}
                  onSelectJob={setSelectedYieldJob}
                  onVerifyYield={handleUpdateYield}
                  onGenerateInvoice={handleGenerateInvoice}
                />
              )}

              {activeTab === "stock" && (
                <MaterialStockManager stock={stock} jobs={jobs} onAddStock={handleAddStock} />
              )}

              {activeTab === "clients" && (
                <PublisherLedger
                  publishers={publishers}
                  jobs={jobs}
                  onContact={(name, phone) =>
                    setContactModalData({ isOpen: true, name, phone })
                  }
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
                  onPayInvoice={handleMarkInvoicePaid}
                  onOpenInvoiceModal={(job) => setSelectedInvoiceModal(job)}
                />
              )}

              {activeTab === "credit-status" && (
                <CreditHoldBanner
                  isCreditHold={isCreditHoldActive}
                  overdueJob={overdueJob}
                  onPayInvoice={handleMarkInvoicePaid}
                  onOpenInvoiceModal={(job) => setSelectedInvoiceModal(job)}
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
          onActionProof={() => {
            setSelectedProofJob(selectedJobModal);
            setSelectedJobModal(null);
            setActiveTab("proofs");
          }}
          onActionYield={() => {
            setSelectedYieldJob(selectedJobModal);
            setSelectedJobModal(null);
            setActiveTab("yield");
          }}
          onActionInvoice={() => {
            setSelectedJobModal(null);
            handleGenerateInvoice(selectedJobModal);
          }}
        />
      )}

      {selectedInvoiceModal && (
        <InvoiceModal
          job={selectedInvoiceModal}
          onClose={() => setSelectedInvoiceModal(null)}
          onPayInvoice={(id) => handleMarkInvoicePaid(id)}
        />
      )}

      {contactModalData.isOpen && (
        <ContactModal
          name={contactModalData.name || "Contact"}
          phone={contactModalData.phone || "+880 1711-000000"}
          onClose={() => setContactModalData({ isOpen: false })}
        />
      )}

      {/* Floating Debug overlay logger */}
      <DebugOverlay />
    </div>
  );
}
