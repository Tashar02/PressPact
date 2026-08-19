import { supabase } from "../lib/supabase";
import { UserProfile, UserRole } from "../types";

export interface SignUpParams {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  businessName: string;
  phone?: string;
  location?: string;
}

export const authService = {
  /**
   * Register a new user account in Supabase Auth and initialize profile
   */
  async signUp(params: SignUpParams): Promise<UserProfile> {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          role: params.role,
          fullName: params.fullName,
          businessName: params.businessName,
          phone: params.phone || "",
          shopLocation: params.location || "",
        },
      },
    });

    if (error) {
      console.error("Supabase Auth sign-up error:", error);
      throw error;
    }

    if (!data.user) {
      throw new Error("Registration failed. Please try again.");
    }

    const profile: UserProfile = {
      id: data.user.id,
      email: params.email,
      role: params.role,
      fullName: params.fullName,
      businessName: params.businessName,
      phone: params.phone,
      location: params.location,
    };

    // Ensure profile row exists in case SQL triggers are delayed
    try {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: params.email,
        role: params.role,
        full_name: params.fullName,
        business_name: params.businessName,
        phone: params.phone || "",
        location: params.location || "",
      });

      if (params.role === "publisher") {
        await supabase.from("publishers").upsert({
          id: data.user.id,
          name: params.businessName,
          contact_person: params.fullName,
          phone: params.phone || "",
          email: params.email,
          location: params.location || "",
          total_orders: 0,
          outstanding_balance_bdt: 0.0,
          oldest_overdue_days: 0,
          credit_hold_status: false,
        });
      }
    } catch (e) {
      console.warn("Direct profile upsert fallback warning:", e);
    }

    return profile;
  },

  /**
   * Sign in user with email and password
   */
  async signIn(email: string, password: string): Promise<UserProfile> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase Auth sign-in error:", error);
      throw error;
    }

    if (!data.user) {
      throw new Error("No user returned from login.");
    }

    // Try fetching from profiles table
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    const userMeta = data.user.user_metadata || {};
    const role: UserRole = profileRow?.role || userMeta.role || "publisher";
    const fullName = profileRow?.full_name || userMeta.fullName || userMeta.full_name || email.split("@")[0];
    const businessName = profileRow?.business_name || userMeta.businessName || userMeta.business_name || (role === "press_owner" ? "Nova Lamination" : "Publisher Workspace");

    return {
      id: data.user.id,
      email: data.user.email || email,
      role: role,
      fullName: fullName,
      businessName: businessName,
      phone: profileRow?.phone || userMeta.phone,
      location: profileRow?.location || userMeta.shopLocation,
    };
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Supabase Auth sign-out error:", error);
      throw error;
    }
  },

  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return null;

    const user = session.user;
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const userMeta = user.user_metadata || {};
    const role: UserRole = profileRow?.role || userMeta.role || "publisher";

    return {
      id: user.id,
      email: user.email || "",
      role: role,
      fullName: profileRow?.full_name || userMeta.fullName || userMeta.full_name || user.email?.split("@")[0] || "User",
      businessName: profileRow?.business_name || userMeta.businessName || userMeta.business_name || (role === "press_owner" ? "Nova Lamination" : "Publisher Workspace"),
      phone: profileRow?.phone || userMeta.phone,
      location: profileRow?.location || userMeta.shopLocation,
    };
  },
};
