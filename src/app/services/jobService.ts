import { supabase } from "../lib/supabase";
import { JobOrder, ProofLog, BusinessLog } from "../types";

// Helper mapper from Postgres snake_case columns to TypeScript JobOrder
function mapDbToJobOrder(row: any, proofLogs: ProofLog[] = [], businessLogs: BusinessLog[] = []): JobOrder {
  return {
    id: row.id,
    bookTitle: row.book_title,
    publisherId: row.publisher_id || undefined,
    publisherName: row.publisher_name,
    pressName: row.press_name,
    pressOwnerName: row.press_owner_name,
    coversCount: row.covers_count,
    laminationType: row.lamination_type,
    dueDate: row.due_date,
    orderDate: row.order_date,
    status: row.status,
    estimatedFilmMeters: Number(row.estimated_film_meters),
    proofPhotoUrl: row.proof_photo_url || undefined,
    proofPhotos: row.proof_photos || undefined,
    proofNote: row.proof_note || undefined,
    proofLogs: proofLogs,
    totalIntake: row.total_intake ? Number(row.total_intake) : undefined,
    goodOutput: row.good_output ? Number(row.good_output) : undefined,
    wasteCount: row.waste_count ? Number(row.waste_count) : undefined,
    yieldVerified: row.yield_verified || false,
    invoiceId: row.invoice_id || undefined,
    amountBdt: row.amount_bdt ? Number(row.amount_bdt) : undefined,
    invoiceDueDate: row.invoice_due_date || undefined,
    paymentStatus: row.payment_status || undefined,
    daysOverdue: row.days_overdue || 0,
    bkashTrxId: row.bkash_trx_id || undefined,
    bkashAmount: row.bkash_amount != null ? Number(row.bkash_amount) : undefined,
    paymentSubmittedAt: row.payment_submitted_at || undefined,
    paymentNote: row.payment_note || undefined,
    paymentNotePhotoUrl: row.payment_note_photo_url || undefined,
    coverSupply: row.cover_supply || undefined,
    coverType: row.cover_type || undefined,
    coverStatus: row.cover_status || undefined,
    coverRequestPriceBdt: row.cover_request_price_bdt != null ? Number(row.cover_request_price_bdt) : undefined,
    coverPriceBdt: row.cover_price_bdt != null ? Number(row.cover_price_bdt) : undefined,
    createdAt: row.created_at || undefined,
    businessLogs: businessLogs,
  };
}

export const jobService = {
  /**
   * Fetch all job orders along with their nested proof audit logs
   */
  async fetchJobOrders(publisherName?: string): Promise<JobOrder[]> {
    let query = supabase.from("job_orders").select("*").order("created_at", { ascending: false });
    
    if (publisherName) {
      query = query.eq("publisher_name", publisherName);
    }

    const { data: jobs, error: jobsError } = await query;

    if (jobsError) {
      console.error("Error fetching job orders from Supabase:", jobsError);
      throw jobsError;
    }

    const { data: logs, error: logsError } = await supabase
      .from("proof_logs")
      .select("*")
      .order("timestamp", { ascending: true });

    if (logsError) {
      console.error("Error fetching proof logs from Supabase:", logsError);
    }

    const { data: bizLogs, error: bizLogsError } = await supabase
      .from("business_logs")
      .select("*")
      .order("timestamp", { ascending: true });

    if (bizLogsError) {
      console.error("Error fetching business logs from Supabase:", bizLogsError);
    }

    const logsByJobId: Record<string, ProofLog[]> = {};
    (logs || []).forEach((log: any) => {
      if (!logsByJobId[log.job_id]) {
        logsByJobId[log.job_id] = [];
      }
      logsByJobId[log.job_id].push({
        id: log.id,
        timestamp: new Date(log.timestamp).toISOString(),
        action: log.action,
        actor: log.actor,
        role: log.role,
        note: log.note || undefined,
        photoUrl: log.photo_url || undefined,
      });
    });

    const bizLogsByJobId: Record<string, BusinessLog[]> = {};
    (bizLogs || []).forEach((log: any) => {
      if (!bizLogsByJobId[log.job_id]) {
        bizLogsByJobId[log.job_id] = [];
      }
      bizLogsByJobId[log.job_id].push({
        id: log.id,
        timestamp: new Date(log.timestamp).toISOString(),
        jobId: log.job_id,
        actor: log.actor,
        role: log.role,
        action: log.action,
        note: log.note || undefined,
      });
    });

    return (jobs || []).map((job: any) => mapDbToJobOrder(job, logsByJobId[job.id] || [], bizLogsByJobId[job.id] || []));
  },

  /**
   * Upload one or more proof image files to Supabase Storage bucket 'proofs'.
   * Throws when a bucket upload fails so a proof is never silently recorded
   * with a local-only copy that the publisher cannot see.
   */
  async uploadProofImageFile(file: File, jobId: string): Promise<string> {
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${jobId.replace("#", "")}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `samples/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("proofs")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(
        "Proof photo could not be uploaded to the shared proof bucket. Please check storage permissions and try again."
      );
    }

    const { data } = supabase.storage.from("proofs").getPublicUrl(filePath);
    return data.publicUrl;
  },

  async uploadProofImageFiles(files: File[], jobId: string): Promise<string[]> {
    return Promise.all(files.map((f) => this.uploadProofImageFile(f, jobId)));
  },

  /**
   * Create a new job order in Supabase
   */
  async createJobOrder(order: Omit<JobOrder, "proofLogs">): Promise<JobOrder> {
    const dbRow = {
      id: order.id,
      book_title: order.bookTitle,
      publisher_id: order.publisherId || null,
      publisher_name: order.publisherName,
      press_name: order.pressName,
      covers_count: order.coversCount,
      lamination_type: order.laminationType,
      due_date: order.dueDate,
      order_date: order.orderDate,
      status: order.status,
      estimated_film_meters: order.estimatedFilmMeters,
      cover_supply: order.coverSupply || null,
      cover_type: order.coverType || null,
      cover_status: order.coverStatus || null,
      cover_request_price_bdt: order.coverRequestPriceBdt ?? null,
      cover_price_bdt: order.coverPriceBdt ?? null,
    };

    const { data, error } = await supabase
      .from("job_orders")
      .insert([dbRow])
      .select()
      .single();

    if (error) {
      console.error("Error creating job order:", error);
      throw error;
    }

    return mapDbToJobOrder(data, []);
  },

  /**
   * Upload sample proof photo(s) and log the upload event. photoUrls is always
   * an array so a press can attach multiple test-cover photos in one submit.
   */
  async uploadProof(
    jobId: string,
    photoUrls: string[],
    note: string,
    actorName: string
  ): Promise<void> {
    const firstUrl = photoUrls[0] || "";
    // 1. Update Job Status & Proof Photos
    const { error: updateError } = await supabase
      .from("job_orders")
      .update({
        status: "Awaiting Proof",
        proof_photo_url: firstUrl || null,
        proof_photos: photoUrls.length > 0 ? photoUrls : null,
        proof_note: note,
      })
      .eq("id", jobId);

    if (updateError) throw updateError;

    // 2. Insert Proof Audit Log
    const { error: logError } = await supabase.from("proof_logs").insert([
      {
        job_id: jobId,
        action: "uploaded",
        actor: actorName,
        role: "press_owner",
        note: note,
        photo_url: firstUrl || null,
      },
    ]);

    if (logError) throw logError;
  },

  /**
   * Publisher approves the quality sample proof
   */
  async approveProof(jobId: string, actorName: string, note?: string): Promise<void> {
    // 1. Log the binding approval first so the production guard sees it
    const { error: logError } = await supabase.from("proof_logs").insert([
      {
        job_id: jobId,
        action: "approved",
        actor: actorName,
        role: "publisher",
        note: note || "Approved for full production run.",
      },
    ]);

    if (logError) throw logError;

    // 2. Advance the job into production
    const { error: updateError } = await supabase
      .from("job_orders")
      .update({ status: "In Production" })
      .eq("id", jobId);

    if (updateError) throw updateError;
  },

  /**
   * Publisher rejects proof sample with feedback
   */
  async rejectProof(jobId: string, actorName: string, note: string): Promise<void> {
    // 1. Log the binding rejection first
    const { error: logError } = await supabase.from("proof_logs").insert([
      {
        job_id: jobId,
        action: "rejected",
        actor: actorName,
        role: "publisher",
        note: note,
      },
    ]);

    if (logError) throw logError;

    // 2. Hold the job out of production
    const { error: updateError } = await supabase
      .from("job_orders")
      .update({ status: "Proof Rejected" })
      .eq("id", jobId);

    if (updateError) throw updateError;
  },

  /**
   * Save Yield & Waste math check verification values
   */
  async verifyYield(
    jobId: string,
    totalIntake: number,
    goodOutput: number,
    wasteCount: number,
    isMatched: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from("job_orders")
      .update({
        total_intake: totalIntake,
        good_output: goodOutput,
        waste_count: wasteCount,
        yield_verified: isMatched,
      })
      .eq("id", jobId);

    if (error) throw error;
  },

  /**
   * Generate an invoice for a job and persist it to Supabase
   */
  async generateInvoice(
    jobId: string,
    invoiceId: string,
    amountBdt: number,
    invoiceDueDate: string
  ): Promise<void> {
    const { error } = await supabase
      .from("job_orders")
      .update({
        invoice_id: invoiceId,
        amount_bdt: amountBdt,
        invoice_due_date: invoiceDueDate,
        payment_status: "Unpaid",
        status: "Invoiced",
      })
      .eq("id", jobId);

    if (error) throw error;
  },

  /**
   * Mark an invoice as paid and clear overdue days
   */
  async markInvoicePaid(jobId: string): Promise<void> {
    const { error } = await supabase
      .from("job_orders")
      .update({
        payment_status: "Paid",
        days_overdue: 0,
      })
      .eq("id", jobId);

    if (error) throw error;
  },

  /**
   * Two-step payment, step 1: the publisher submits their bKash transaction
   * id and amount sent so the press can verify before confirming.
   */
  async submitBkashPayment(jobId: string, trxId: string, amountBdt: number): Promise<void> {
    const { error } = await supabase
      .from("job_orders")
      .update({
        bkash_trx_id: trxId,
        bkash_amount: amountBdt,
        payment_submitted_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) throw error;
  },

  /**
   * Press responds to a bKash payment attempt (e.g. amount mismatch) with a
   * message — and an optional proof/screenshot — the publisher sees next time
   * they open the invoice.
   */
  async sendPaymentMessage(jobId: string, note: string, photoUrl?: string): Promise<void> {
    const { error } = await supabase
      .from("job_orders")
      .update({ payment_note: note, payment_note_photo_url: photoUrl || null })
      .eq("id", jobId);

    if (error) throw error;
  },

  /**
   * Upload an image attached to a payment query (e.g. a bank/bKash screenshot)
   * into the shared proofs bucket under a dedicated payments/ folder.
   */
  async uploadPaymentImageFile(file: File, jobId: string): Promise<string> {
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${jobId.replace("#", "")}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `payments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("proofs")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(
        "Screenshot could not be uploaded to the shared storage bucket. Please check storage permissions and try again."
      );
    }

    const { data } = supabase.storage.from("proofs").getPublicUrl(filePath);
    return data.publicUrl;
  },

  /**
   * Respond to a cover-supply request: approve (locking in the offered
   * per-cover price) or reject. A rejection never deletes the order — the
   * decision stays on record in the business books.
   */
  async respondCoverRequest(
    jobId: string,
    status: "approved" | "rejected",
    priceBdt?: number
  ): Promise<void> {
    const { error } = await supabase
      .from("job_orders")
      .update({
        cover_status: status,
        cover_price_bdt: status === "approved" ? (priceBdt ?? null) : null,
      })
      .eq("id", jobId);

    if (error) throw error;
  },

  /**
   * Append an immutable entry to the business books ledger for a job.
   */
  async addBusinessLog(input: {
    jobId: string;
    actor: string;
    role: "press_owner" | "publisher";
    action: string;
    note?: string;
  }): Promise<void> {
    const { error } = await supabase.from("business_logs").insert([
      {
        job_id: input.jobId,
        actor: input.actor,
        role: input.role,
        action: input.action,
        note: input.note || null,
      },
    ]);

    if (error) throw error;
  },
};
