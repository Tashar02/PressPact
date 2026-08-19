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

export interface SignUpResult {
  profile: UserProfile;
  needsEmailConfirmation: boolean;
}

export const authService = {
  /**
   * Register a new user account in Supabase Auth and initialize profile
   */
  async signUp(params: SignUpParams): Promise<SignUpResult> {
    const cleanEmail = params.email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: params.password,
      options: {
        data: {
          role: params.role,
          fullName: params.fullName.trim(),
          businessName: params.businessName.trim(),
          phone: params.phone?.trim() || "",
          shopLocation: params.location?.trim() || "",
        },
      },
    });

    if (error) {
      console.error("Supabase Auth sign-up error:", error);
      if (
        error.message.toLowerCase().includes("already registered") ||
        error.message.toLowerCase().includes("already exists")
      ) {
        throw new Error("This email is already registered. Please log in instead.");
      }
      throw new Error(error.message || "Registration failed. Please try again.");
    }

    // In Supabase, if an email is already registered and email confirmation is on, identities array is empty
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error("This email is already registered. Please log in with your password.");
    }

    if (!data.user) {
      throw new Error("Registration failed. Please try again.");
    }

    const profile: UserProfile = {
      id: data.user.id,
      email: cleanEmail,
      role: params.role,
      fullName: params.fullName.trim(),
      businessName: params.businessName.trim(),
      phone: params.phone?.trim(),
      location: params.location?.trim(),
    };

    // When Supabase email confirmation is ON, session is null after sign-up.
    // We still write the profile row but tell the caller confirmation is needed.
    const needsEmailConfirmation = !data.session;

    // Ensure profile and publisher records are inserted
    try {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: cleanEmail,
        role: params.role,
        full_name: params.fullName.trim(),
        business_name: params.businessName.trim(),
        phone: params.phone?.trim() || "",
        location: params.location?.trim() || "",
      });

      if (params.role === "publisher") {
        await supabase.from("publishers").upsert({
          id: data.user.id,
          name: params.businessName.trim(),
          contact_person: params.fullName.trim(),
          phone: params.phone?.trim() || "",
          email: cleanEmail,
          location: params.location?.trim() || "",
          total_orders: 0,
          outstanding_balance_bdt: 0.0,
          oldest_overdue_days: 0,
          credit_hold_status: false,
        });
      }
    } catch (e) {
      console.warn("Direct profile upsert sync notice:", e);
    }

    return { profile, needsEmailConfirmation };
  },

  /**
   * Sign in user with email and password
   */
  async signIn(email: string, password: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (error) {
      console.error("Supabase Auth sign-in error:", error);
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        throw new Error("Invalid email or password. Please verify your login credentials.");
      }
      if (error.message.toLowerCase().includes("email not confirmed")) {
        throw new Error(
          "Email confirmation is enabled in your Supabase project. In Supabase Dashboard -> Authentication -> Providers -> Email, disable 'Confirm email' for instant login, or check your email inbox to verify."
        );
      }
      throw new Error(error.message || "Failed to sign in. Please try again.");
    }

    if (!data.user) {
      throw new Error("No user found for this account.");
    }

    // Fetch profile details
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    const userMeta = data.user.user_metadata || {};
    const role: UserRole = profileRow?.role || userMeta.role || "publisher";
    const fullName =
      profileRow?.full_name || userMeta.fullName || userMeta.full_name || cleanEmail.split("@")[0];
    const businessName =
      profileRow?.business_name ||
      userMeta.businessName ||
      userMeta.business_name ||
      (role === "press_owner" ? "Nova Lamination" : "Publisher Workspace");

    return {
      id: data.user.id,
      email: data.user.email || cleanEmail,
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
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
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
      fullName:
        profileRow?.full_name ||
        userMeta.fullName ||
        userMeta.full_name ||
        user.email?.split("@")[0] ||
        "User",
      businessName:
        profileRow?.business_name ||
        userMeta.businessName ||
        userMeta.business_name ||
        (role === "press_owner" ? "Nova Lamination" : "Publisher Workspace"),
      phone: profileRow?.phone || userMeta.phone,
      location: profileRow?.location || userMeta.shopLocation,
    };
  },
};
