import { supabase } from "../lib/supabase";
import { PublisherClient, NotificationItem } from "../types";

function mapDbToPublisher(row: any): PublisherClient {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    location: row.location,
    totalOrders: Number(row.total_orders),
    outstandingBalanceBdt: Number(row.outstanding_balance_bdt),
    oldestOverdueDays: Number(row.oldest_overdue_days),
    creditHoldStatus: Boolean(row.credit_hold_status),
  };
}

function mapDbToNotification(row: any): NotificationItem {
  return {
    id: row.id,
    timestamp: new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    title: row.title,
    message: row.message,
    type: row.type,
    unread: row.unread,
    jobId: row.job_id || undefined,
  };
}

export const publisherService = {
  /**
   * Fetch all publishers from Supabase
   */
  async fetchPublishers(): Promise<PublisherClient[]> {
    const { data, error } = await supabase
      .from("publishers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching publishers from Supabase:", error);
      throw error;
    }

    return (data || []).map(mapDbToPublisher);
  },

  /**
   * Set credit hold status and oldest overdue days for a publisher
   */
  async setCreditHold(
    id: string,
    holdStatus: boolean,
    oldestOverdueDays?: number
  ): Promise<void> {
    const updates: Record<string, unknown> = { credit_hold_status: holdStatus };
    if (oldestOverdueDays !== undefined) {
      updates.oldest_overdue_days = oldestOverdueDays;
    }
    const { error } = await supabase.from("publishers").update(updates).eq("id", id);

    if (error) {
      console.error("Error updating credit hold status:", error);
      throw error;
    }
  },

  /**
   * Fetch in-app notifications
   */
  async fetchNotifications(): Promise<NotificationItem[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }

    return (data || []).map(mapDbToNotification);
  },

  /**
   * Mark a notification as read
   */
  async markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ unread: false })
      .eq("id", id);

    if (error) {
      console.error("Error marking notification read:", error);
    }
  },

  /**
   * Persist a new notification to Supabase
   */
  async createNotification(notification: {
    title: string;
    message: string;
    type: "proof" | "yield" | "credit" | "stock" | "order";
    jobId?: string;
  }): Promise<void> {
    const { error } = await supabase.from("notifications").insert([
      {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        unread: true,
        job_id: notification.jobId || null,
      },
    ]);

    if (error) {
      console.warn("Notification persist notice:", error.message);
    }
  },

  /**
   * Increment the total_orders count for a publisher
   */
  async incrementPublisherOrder(publisherId: string): Promise<void> {
    const { error } = await supabase.rpc("increment_publisher_orders", {
      pub_id: publisherId,
    });

    if (error) {
      console.warn("Publisher order increment notice:", error.message);
    }
  },

  /**
   * Update outstanding balance for a publisher
   */
  async updateOutstandingBalance(
    publisherId: string,
    amountBdt: number
  ): Promise<void> {
    const { error } = await supabase
      .from("publishers")
      .update({ outstanding_balance_bdt: amountBdt })
      .eq("id", publisherId);

    if (error) {
      console.warn("Publisher balance update notice:", error.message);
    }
  },
};
