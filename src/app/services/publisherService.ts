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
   * Toggle credit hold status for a publisher
   */
  async setCreditHold(id: string, holdStatus: boolean): Promise<void> {
    const { error } = await supabase
      .from("publishers")
      .update({ credit_hold_status: holdStatus })
      .eq("id", id);

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
};
