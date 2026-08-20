import { useState, useEffect, useMemo, useRef } from "react";
import {
  UserRole,
  UserProfile,
  JobOrder,
  FilmStockItem,
  PublisherClient,
  NotificationItem,
  CoverTypeItem,
} from "./types";
import { supabase } from "./lib/supabase";
import { daysPastDue, estimateFilmMeters } from "./lib/calc";
import { authService } from "./services/authService";
import { jobService } from "./services/jobService";
import { stockService } from "./services/stockService";
import { publisherService } from "./services/publisherService";
import { coverService } from "./services/coverService";
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
import { NotificationToasts } from "./components/common/NotificationToasts";
import { DebugOverlay } from "./components/common/DebugOverlay";
import { Layers, LayoutDashboard, FileCheck, Calculator, Users, PlusCircle, Receipt, AlertTriangle, Loader2 } from "lucide-react";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("press_owner");
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);

  // App Master Data State
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [stock, setStock] = useState<FilmStockItem[]>([]);
  const [coverTypes, setCoverTypes] = useState<CoverTypeItem[]>([]);
  const [publishers, setPublishers] = useState<PublisherClient[]>([]);
  const [presses, setPresses] = useState<string[]>([]);
  const [pressLocations, setPressLocations] = useState<Record<string, string>>({});
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
  const [jobSearchQuery, setJobSearchQuery] = useState("");

  // Elegant top-right notification toasts: new unread notifications that
  // arrive during the session slide in and fade out after ~5 seconds.
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const seenNotifIds = useRef<Set<string>>(new Set());

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
      // Ignore SIGNED_IN raised by sign-up: authService signs the user out
      // immediately after creating the account, and honouring that session
      // here would flash the dashboard for a frame before the login screen.
      if (event === "SIGNED_IN" && session?.user && !authService.isSignUpInProgress()) {
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
        const [fetchedJobs, fetchedStock, fetchedPublishers, fetchedNotifs, fetchedPresses, fetchedPressLocations, fetchedCoverTypes] =
          await Promise.all([
            jobService.fetchJobOrders(),
            stockService.fetchFilmStock(),
            publisherService.fetchPublishers(),
            publisherService.fetchNotifications(),
            authService.fetchPresses(),
            authService.fetchPressLocations(),
            coverService.fetchCoverTypes(),
          ]);

        setJobs(fetchedJobs || []);
        setStock(fetchedStock || []);
        setCoverTypes(fetchedCoverTypes || []);
        setPublishers(fetchedPublishers || []);
        setNotifications(fetchedNotifs || []);
        setPresses(fetchedPresses || []);
        setPressLocations(fetchedPressLocations || {});

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
        return !!job && job.pressName.toLowerCase() === userBusinessName;
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

  // Surface newly-arrived notifications as top-right toasts. The first run
  // seeds the seen-set with everything already present so pre-existing unread
  // items don't all pop up on login; anything that appears afterwards toasts.
  useEffect(() => {
    if (visibleNotifications.length === 0) return;
    if (seenNotifIds.current.size === 0) {
      visibleNotifications.forEach((n) => seenNotifIds.current.add(n.id));
      return;
    }
    const fresh = visibleNotifications.filter(
      (n) => n.unread && !seenNotifIds.current.has(n.id)
    );
    if (fresh.length > 0) {
      fresh.forEach((n) => seenNotifIds.current.add(n.id));
      setToasts((prev) => [...prev, ...fresh]);
    }
  }, [visibleNotifications]);

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

  // Action: Upload Proof Photo(s)
  const handleUploadProof = (jobId: string, photoUrls: string[], note: string) => {
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
            photoUrl: photoUrls[0] || undefined,
          };
          return {
            ...j,
            status: "Awaiting Proof" as const,
            proofPhotoUrl: photoUrls[0] || j.proofPhotoUrl,
            proofPhotos: photoUrls.length > 0 ? photoUrls : j.proofPhotos,
            proofNote: note,
            proofLogs: [newLog, ...(j.proofLogs || [])],
          };
        }
        return j;
      })
    );

    // Sync to Supabase
    jobService.uploadProof(jobId, photoUrls, note, actorName).catch((err) => {
      console.warn("Proof upload backend sync notice:", err.message || err);
    });

    // Log the submission in the business books
    jobService.addBusinessLog({
      jobId,
      actor: actorName,
      role: "press_owner",
      action: "proof_uploaded",
      note: `${photoUrls.length} proof photo(s) submitted with note.`,
    }).catch(() => {});

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
  const handleGenerateInvoice = async (job: JobOrder, amountBdt: number): Promise<void> => {
    const invoiceId = job.invoiceId || `INV-${new Date().getFullYear()}-${job.id.replace('#ORD-', '')}`;
    // Due date = 30 days from today — needed for real-time credit hold calculation
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const invoiceDueDate = dueDate.toISOString().split("T")[0];

    // Use the freshest job state so the invoice carries the verified yield figures
    const freshJob = jobs.find((j) => j.id === job.id) || job;
    const finalAmount = amountBdt || freshJob.amountBdt || 0;

    // Persist first: never show an invoice the backend rejected (the DB enforces
    // verified-yield math before the status may move to Invoiced).
    await jobService.generateInvoice(job.id, invoiceId, finalAmount, invoiceDueDate);

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

  // Action: Add Stock (restock an existing roll type, optionally updating price)
  const handleAddStock = (type: string, meters: number, perCoverPriceBdt?: number) => {
    const today = new Date().toISOString().split("T")[0];
    setStock((prev) =>
      prev.map((s) =>
        s.type === type && s.pressName === currentUser?.businessName
          ? {
              ...s,
              availableMeters: s.availableMeters + meters,
              perCoverPriceBdt: perCoverPriceBdt ?? s.perCoverPriceBdt,
              lastRestocked: today,
            }
          : s
      )
    );

    const matchItem = stock.find(
      (s) => s.type === type && s.pressName === currentUser?.businessName
    );
    if (matchItem) {
      stockService.restockItem(matchItem.id, meters, perCoverPriceBdt).catch((err) => {
        console.warn("Stock restock backend sync notice:", err.message || err);
      });
    }
  };

  // Action: Register a brand-new roll type for this press's inventory
  const handleAddNewRollType = (params: {
    type: string;
    rollWidthCm: number;
    minThresholdMeters: number;
    perCoverPriceBdt: number;
    initialMeters: number;
  }) => {
    const today = new Date().toISOString().split("T")[0];
    const newItem: FilmStockItem = {
      id: `stk-${Date.now()}`,
      type: params.type,
      availableMeters: params.initialMeters,
      rollWidthCm: params.rollWidthCm,
      minThresholdMeters: params.minThresholdMeters,
      lastRestocked: today,
      pressName: currentUser?.businessName,
      perCoverPriceBdt: params.perCoverPriceBdt,
    };
    setStock((prev) => [...prev, newItem]);
    stockService
      .addNewRollType({
        pressName: currentUser?.businessName || "",
        ...params,
      })
      .catch((err) => {
        console.warn("New roll type backend sync notice:", err.message || err);
      });
  };

  // Action: Register a new cover type (paper stock) the press can supply
  const handleAddCoverType = (params: { name: string; priceBdt: number; description?: string }) => {
    const pressName = currentUser?.businessName || "";
    const newItem: CoverTypeItem = {
      id: `cvr-${Date.now()}`,
      pressName,
      name: params.name,
      priceBdt: params.priceBdt,
      description: params.description,
    };
    setCoverTypes((prev) => [...prev, newItem]);
    coverService
      .addCoverType({ pressName, ...params })
      .catch((err) => {
        console.warn("New cover type backend sync notice:", err.message || err);
      });
  };

  // Action: Update a cover type's per-cover price
  const handleUpdateCoverTypePrice = (id: string, priceBdt: number) => {
    setCoverTypes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, priceBdt } : c))
    );
    coverService.updateCoverTypePrice(id, priceBdt).catch((err) => {
      console.warn("Cover type price update notice:", err.message || err);
    });
  };

  // Action: Press accepts or rejects a publisher's cover-supply request.
  // A rejection never deletes the order — the decision stays in the books.
  const handleRespondCoverRequest = (jobId: string, accepted: boolean) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const actorName = `${currentUser?.fullName || "Press Owner"} (Press Owner)`;
    const decision = accepted ? "approved" : "rejected";
    const price = accepted ? job.coverRequestPriceBdt : undefined;

    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              coverStatus: decision as "approved" | "rejected",
              coverPriceBdt: accepted ? (price ?? j.coverRequestPriceBdt) : undefined,
            }
          : j
      )
    );

    jobService.respondCoverRequest(jobId, decision, price).catch((err) => {
      console.warn("Cover request response sync notice:", err.message || err);
    });

    jobService
      .addBusinessLog({
        jobId,
        actor: actorName,
        role: "press_owner",
        action: accepted ? "cover_request_approved" : "cover_request_rejected",
        note: accepted
          ? `Accepted cover supply for ${job.coverType} at BDT ${(price ?? 0).toLocaleString()}/cover.`
          : `Rejected cover supply request for ${job.coverType}. Order kept on record.`,
      })
      .catch(() => {});

    const notif = {
      id: `notif-${Date.now()}`,
      timestamp: "Just now",
      title: accepted ? "Cover Supply Approved ✓" : "Cover Supply Request Declined",
      message: accepted
        ? `${job.pressName} accepted cover supply (${job.coverType}) for ${jobId} at BDT ${(price ?? 0).toLocaleString()}/cover.`
        : `${job.pressName} declined the cover supply request (${job.coverType}) for ${jobId}. The order stays on record.`,
      type: "cover" as const,
      unread: true,
      jobId,
    };
    setNotifications((prev) => [notif, ...prev]);
    publisherService.createNotification(notif).catch(() => {});
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

  // Action: Publisher submits a bKash payment attempt for an invoice
  const handleSubmitBkashPayment = async (jobId: string, trxId: string, amountBdt: number) => {
    await jobService.submitBkashPayment(jobId, trxId, amountBdt);
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              bkashTrxId: trxId,
              bkashAmount: amountBdt,
              paymentSubmittedAt: new Date().toISOString(),
            }
          : j
      )
    );
    const notif = {
      id: `notif-${Date.now()}`,
      timestamp: "Just now",
      title: "bKash Payment Submitted",
      message: `Publisher submitted bKash payment (TRX ${trxId}, BDT ${amountBdt.toLocaleString()}) for ${jobId}. Awaiting press confirmation.`,
      type: "credit" as const,
      unread: true,
      jobId,
    };
    setNotifications((prev) => [notif, ...prev]);
    publisherService.createNotification(notif).catch(() => {});
  };

  // Action: Press replies to a bKash payment attempt with a message (+ optional screenshot)
  const handleSendPaymentMessage = async (jobId: string, note: string, photoUrl?: string) => {
    await jobService.sendPaymentMessage(jobId, note, photoUrl);
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, paymentNote: note, paymentNotePhotoUrl: photoUrl || j.paymentNotePhotoUrl }
          : j
      )
    );
    const match = jobs.find((j) => j.id === jobId);
    const notif = {
      id: `notif-${Date.now()}`,
      timestamp: "Just now",
      title: "Payment Query from Press",
      message: `${match?.pressName || "Press"} replied about your bKash payment on ${jobId}: "${note}"`,
      type: "credit" as const,
      unread: true,
      jobId,
    };
    setNotifications((prev) => [notif, ...prev]);
    publisherService.createNotification(notif).catch(() => {});
  };

  // Action: Create New Order
  const handleCreateOrder = (newOrd: {
    bookTitle: string;
    coversCount: number;
    laminationType: string;
    dueDate: string;
    pressName: string;
    coverSupply?: "client_supplied" | "press_purchased";
    coverType?: string;
    coverStatus?: "requested" | "approved" | "rejected";
    coverRequestPriceBdt?: number;
    coverPriceBdt?: number;
  }) => {
    // Sequential human-friendly order id: #ORD-0000001, #ORD-0000002, ...
    // Derived from the highest existing numeric id so it is deterministic
    // without a DB write at submit time.
    const maxSeq = jobs.reduce((max, j) => {
      const m = j.id.match(/^#ORD-(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const id = `#ORD-${String(maxSeq + 1).padStart(8, "0")}`;
    const sessionPublisherName = currentUser?.businessName || "Unknown Publisher";
    const sessionPressName =
      newOrd.pressName || presses.find((p) => p.toLowerCase() === "nova lamination") || "Nova Lamination";
    const matchPub = publishers.find((p) => p.name === sessionPublisherName);
    const nowIso = new Date().toISOString();
    const newJob: JobOrder = {
      id,
      bookTitle: newOrd.bookTitle,
      publisherId: matchPub?.id,
      publisherName: sessionPublisherName,
      pressName: sessionPressName,
      coversCount: newOrd.coversCount,
      laminationType: newOrd.laminationType,
      dueDate: newOrd.dueDate,
      orderDate: nowIso.split("T")[0],
      createdAt: nowIso,
      status: "Order Placed",
      estimatedFilmMeters: estimateFilmMeters(newOrd.coversCount),
      proofLogs: [],
      coverSupply: newOrd.coverSupply,
      coverType: newOrd.coverType,
      coverStatus: newOrd.coverStatus,
      coverRequestPriceBdt: newOrd.coverRequestPriceBdt,
      coverPriceBdt: newOrd.coverPriceBdt,
    };

    setJobs((prev) => [newJob, ...prev]);

    // Sync to Supabase
    jobService.createJobOrder(newJob).catch((err) => {
      console.warn("New order backend creation notice:", err.message || err);
    });
    // Deduct meters from the chosen press's own roll stock
    stockService.deductStock(sessionPressName, newOrd.laminationType, newJob.estimatedFilmMeters).catch((err) => {
      console.warn("Stock deduction backend sync notice:", err.message || err);
    });

    // Every order is entered into the business books, including the cover-supply choice
    const coverNote =
      newOrd.coverSupply === "press_purchased"
        ? `Cover supply: press purchases ${newOrd.coverType || "covers"}${
            newOrd.coverStatus === "requested"
              ? ` (requested at BDT ${(newOrd.coverRequestPriceBdt ?? 0).toLocaleString()}/cover)`
              : ` at BDT ${(newOrd.coverPriceBdt ?? 0).toLocaleString()}/cover`
          }.`
        : "Cover supply: client supplies own covers.";
    jobService.addBusinessLog({
      jobId: id,
      actor: `${currentUser?.fullName || "Publisher"} (Publisher)`,
      role: "publisher",
      action: "order_placed",
      note: coverNote,
    }).catch(() => {});

    // Mirror the deduction locally so the stock meter stays in sync
    setStock((prev) =>
      prev.map((s) =>
        s.type === newOrd.laminationType && s.pressName === sessionPressName
          ? { ...s, availableMeters: Math.max(0, s.availableMeters - newJob.estimatedFilmMeters) }
          : s
      )
    );

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
  const lowStockCount = stock.filter(
    (s) =>
      s.pressName === currentUser?.businessName &&
      s.availableMeters <= s.minThresholdMeters
  ).length;

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
          onLogout={handleLogout}
          activeTabTitle={tabTitles[activeTab] || "PressPact Portal"}
          notifications={visibleNotifications}
          onMarkNotificationsRead={() => {
            setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
            publisherService.markAllNotificationsRead();
          }}
          onSelectNotificationJob={(jobId) => {
            const match = visibleJobs.find((j) => j.id === jobId);
            if (match) setSelectedJobModal(match);
          }}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          searchQuery={jobSearchQuery}
          onSearchQueryChange={setJobSearchQuery}
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
                  onRespondCoverRequest={handleRespondCoverRequest}
                  searchQuery={jobSearchQuery}
                  onSearchQueryChange={setJobSearchQuery}
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
                  stock={stock}
                  selectedJob={selectedYieldJob}
                  onSelectJob={setSelectedYieldJob}
                  onVerifyYield={handleUpdateYield}
                  onGenerateInvoice={handleGenerateInvoice}
                />
              )}

              {activeTab === "stock" && (
                <MaterialStockManager
                  stock={stock}
                  jobs={visibleJobs}
                  pressName={currentUser?.businessName || ""}
                  coverTypes={coverTypes.filter((c) => c.pressName === currentUser?.businessName)}
                  onAddStock={handleAddStock}
                  onAddNewType={handleAddNewRollType}
                  onAddCoverType={handleAddCoverType}
                  onUpdateCoverTypePrice={handleUpdateCoverTypePrice}
                />
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
                  searchQuery={jobSearchQuery}
                  onSearchQueryChange={setJobSearchQuery}
                />
              )}

              {activeTab === "new-order" && (
                <NewOrderForm
                  stock={stock}
                  presses={presses}
                  coverTypes={coverTypes}
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
                  onPlaceNewOrder={() => setActiveTab("new-order")}
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
          job={jobs.find((j) => j.id === selectedInvoiceModal.id) || selectedInvoiceModal}
          onClose={() => setSelectedInvoiceModal(null)}
          onMarkPaid={(id) => handleMarkInvoicePaid(id)}
          onSubmitPayment={(id, trxId, amount) => handleSubmitBkashPayment(id, trxId, amount)}
          onSendMessage={(id, note, photoUrl) => handleSendPaymentMessage(id, note, photoUrl)}
          onUploadPaymentImage={jobService.uploadPaymentImageFile.bind(jobService)}
          isPressOwner={userRole === "press_owner"}
          pressLocation={pressLocations[selectedInvoiceModal.pressName] || ""}
          publisherLocation={
            publishers.find((p) => p.name === selectedInvoiceModal.publisherName)?.location || ""
          }
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

      {/* Floating Debug overlay logger — dev builds only */}
      {import.meta.env.DEV && <DebugOverlay />}

      {/* Top-right elegant notification toasts */}
      <NotificationToasts
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
