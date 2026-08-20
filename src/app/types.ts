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

export type CoverSupply = "client_supplied" | "press_purchased";
export type CoverStatus = "requested" | "approved" | "rejected";

export interface ProofLog {
  id: string;
  timestamp: string;
  action: "uploaded" | "approved" | "rejected";
  actor: string;
  role: UserRole;
  note?: string;
  photoUrl?: string;
}

export interface BusinessLog {
  id: string;
  timestamp: string;
  jobId: string;
  actor: string;
  role: UserRole;
  action: string;
  note?: string;
}

export interface JobOrder {
  id: string;
  bookTitle: string;
  publisherId?: string;
  publisherName: string;
  pressName: string;
  pressOwnerName?: string;  // e.g. "Md. Abdur Rahim"
  coversCount: number;
  laminationType: string;
  dueDate: string;
  orderDate: string;
  status: JobStatus;
  estimatedFilmMeters: number;

  // Proof Data
  proofPhotoUrl?: string;
  proofPhotos?: string[];
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

  // bKash Payment Submission (two-step payment)
  bkashTrxId?: string;
  bkashAmount?: number;
  paymentSubmittedAt?: string;
  paymentNote?: string;
  paymentNotePhotoUrl?: string;

  // Cover Supply
  coverSupply?: CoverSupply;
  coverType?: string;
  coverStatus?: CoverStatus;
  coverRequestPriceBdt?: number;
  coverPriceBdt?: number;

  // Audit Trail & Receipt Times
  createdAt?: string;
  businessLogs?: BusinessLog[];
}

export interface CoverTypeItem {
  id: string;
  pressName: string;
  name: string;
  priceBdt: number;
  description?: string;
}

export interface FilmStockItem {
  id: string;
  type: string;
  availableMeters: number;
  rollWidthCm: number;
  minThresholdMeters: number;
  lastRestocked: string;
  pressName?: string;
  perCoverPriceBdt?: number;
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
  type: "proof" | "yield" | "credit" | "stock" | "order" | "cover";
  unread: boolean;
  jobId?: string;
}
