import { supabase } from "../lib/supabase";
import { JobOrder, ProofLog } from "../types";

// Helper mapper from Postgres snake_case columns to TypeScript JobOrder
function mapDbToJobOrder(row: any, proofLogs: ProofLog[] = []): JobOrder {
  return {
    id: row.id,
    bookTitle: row.book_title,
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

    const logsByJobId: Record<string, ProofLog[]> = {};
    (logs || []).forEach((log: any) => {
      if (!logsByJobId[log.job_id]) {
        logsByJobId[log.job_id] = [];
      }
      logsByJobId[log.job_id].push({
        id: log.id,
        timestamp: new Date(log.timestamp).toLocaleString(),
        action: log.action,
        actor: log.actor,
        role: log.role,
        note: log.note || undefined,
        photoUrl: log.photo_url || undefined,
      });
    });

    return (jobs || []).map((job: any) => mapDbToJobOrder(job, logsByJobId[job.id] || []));
  },

  /**
   * Upload proof image file to Supabase Storage bucket 'proofs'
   */
  async uploadProofImageFile(file: File, jobId: string): Promise<string> {
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${jobId.replace("#", "")}-${Date.now()}.${fileExt}`;
      const filePath = `samples/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("proofs")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.warn("Supabase Storage bucket upload notice:", uploadError.message);
        // Fallback to local Data URL for seamless client viewing if bucket policies aren't created yet
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const { data } = supabase.storage.from("proofs").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  },

  /**
   * Create a new job order in Supabase
   */
  async createJobOrder(order: Omit<JobOrder, "proofLogs">): Promise<JobOrder> {
    const dbRow = {
      id: order.id,
      book_title: order.bookTitle,
      publisher_name: order.publisherName,
      press_name: order.pressName,
      press_owner_name: order.pressOwnerName || "Md. Abdur Rahim",
      covers_count: order.coversCount,
      lamination_type: order.laminationType,
      due_date: order.dueDate,
      order_date: order.orderDate,
      status: order.status,
      estimated_film_meters: order.estimatedFilmMeters,
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
   * Upload sample proof photo and log the upload event
   */
  async uploadProof(
    jobId: string,
    photoUrl: string,
    note: string,
    actorName: string
  ): Promise<void> {
    // 1. Update Job Status & Proof Photo
    const { error: updateError } = await supabase
      .from("job_orders")
      .update({
        status: "Awaiting Proof",
        proof_photo_url: photoUrl,
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
        photo_url: photoUrl,
      },
    ]);

    if (logError) throw logError;
  },

  /**
   * Publisher approves the quality sample proof
   */
  async approveProof(jobId: string, actorName: string, note?: string): Promise<void> {
    const { error: updateError } = await supabase
      .from("job_orders")
      .update({ status: "In Production" })
      .eq("id", jobId);

    if (updateError) throw updateError;

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
  },

  /**
   * Publisher rejects proof sample with feedback
   */
  async rejectProof(jobId: string, actorName: string, note: string): Promise<void> {
    const { error: updateError } = await supabase
      .from("job_orders")
      .update({ status: "Proof Rejected" })
      .eq("id", jobId);

    if (updateError) throw updateError;

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
  },

  /**
   * Save Yield & Waste math check verification values
   */
  async verifyYield(
    jobId: string,
    totalIntake: number,
    goodOutput: number,
    wasteCount: number
  ): Promise<void> {
    const { error } = await supabase
      .from("job_orders")
      .update({
        total_intake: totalIntake,
        good_output: goodOutput,
        waste_count: wasteCount,
        yield_verified: true,
        status: "Invoiced",
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
};
