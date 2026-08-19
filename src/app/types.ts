export type UserRole = "press_owner" | "publisher";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  businessName: string;
  phone?: string;
  location?: string;
}

export type JobStatus =
  | "Order Placed"
  | "Awaiting Proof"
  | "Proof Rejected"
  | "In Production"
  | "Yield Audit Pending"
  | "Invoiced"
  | "Completed";

export interface ProofLog {
  id: string;
  timestamp: string;
  action: "uploaded" | "approved" | "rejected";
  actor: string;
  role: UserRole;
  note?: string;
  photoUrl?: string;
}

export interface JobOrder {
  id: string;
  bookTitle: string;
  publisherName: string;
  pressName: string;
  pressOwnerName?: string;  // e.g. "Md. Abdur Rahim"
  coversCount: number;
  laminationType: "Matte 30μm" | "Gloss 24μm" | "Velvet Touch" | "Thermal Matte";
  dueDate: string;
  orderDate: string;
  status: JobStatus;
  estimatedFilmMeters: number;

  // Proof Data
  proofPhotoUrl?: string;
  proofNote?: string;
  proofLogs: ProofLog[];

  // Yield & Waste Data
  totalIntake?: number;
  goodOutput?: number;
  wasteCount?: number;
  yieldVerified?: boolean;

  // Invoice Data
  invoiceId?: string;
  amountBdt?: number;
  invoiceDueDate?: string;
  paymentStatus?: "Paid" | "Unpaid" | "Overdue";
  daysOverdue?: number;
}

export interface FilmStockItem {
  id: string;
  type: string;
  availableMeters: number;
  rollWidthCm: number;
  minThresholdMeters: number;
  lastRestocked: string;
}

export interface PublisherClient {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  location: string;
  totalOrders: number;
  outstandingBalanceBdt: number;
  oldestOverdueDays: number;
  creditHoldStatus: boolean;
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: "proof" | "yield" | "credit" | "stock" | "order";
  unread: boolean;
  jobId?: string;
}
