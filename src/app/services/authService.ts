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

// Raised while a sign-up is in flight. When Supabase email confirmation is off,
// signUp() returns a live session that fires SIGNED_IN; without this guard the
// app's auth listener would mount the dashboard for a flash before the
// explicit sign-out below returns the user to the login tab.
let signUpInProgress = false;

async function signUpInternal(params: SignUpParams): Promise<SignUpResult> {
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

  // To prevent auto-login behavior (Supabase automatically signs in on signup if confirm email is off),
  // we explicitly sign out to keep the user on the login tab.
  if (data.session) {
    await supabase.auth.signOut();
  }

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
}

export const authService = {
  /**
   * True while a sign-up is being processed, so the App auth listener knows a
   * freshly created session is not a real login yet.
   */
  isSignUpInProgress(): boolean {
    return signUpInProgress;
  },

  /**
   * Register a new user account in Supabase Auth and initialize profile
   */
  async signUp(params: SignUpParams): Promise<SignUpResult> {
    signUpInProgress = true;
    try {
      return await signUpInternal(params);
    } finally {
      signUpInProgress = false;
    }
  },

  /**
   * Sign in user with email, password, and the role selected at login (FR-5.1).
   * The selected role must match the role stored on the account; otherwise the
   * sign-in is rejected so a user can never be routed to the wrong portal.
   */
  async signIn(email: string, password: string, selectedRole: UserRole): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    // Check the stored role before creating a session. signInWithPassword
    // triggers Supabase's SIGNED_IN event and the app's auth listener signs
    // the user in immediately, which would unmount the login form and erase
    // the error message. Rejecting the role mismatch up front keeps the user
    // on the login page with a visible error (FR-5.1).
    const { data: preProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("email", cleanEmail)
      .maybeSingle();
    const preRole = preProfile?.role as UserRole | undefined;
    if (preRole && preRole !== selectedRole) {
      throw new Error(
        `This account is registered as a ${
          preRole === "press_owner" ? "Press Owner" : "Publisher Client"
        }. Please select the matching role to sign in.`
      );
    }

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
    const storedRole: UserRole | undefined =
      profileRow?.role || userMeta.role || userMeta.user_role;

    if (storedRole && storedRole !== selectedRole) {
      // Fallback for accounts without a profiles row: signInWithPassword
      // already created a session, so roll it back before rejecting so the
      // auth listener cannot sign the user in anyway.
      await supabase.auth.signOut();
      throw new Error(
        `This account is registered as a ${
          storedRole === "press_owner" ? "Press Owner" : "Publisher Client"
        }. Please select the matching role to sign in.`
      );
    }

    const role: UserRole = storedRole || selectedRole;
    const fullName =
      profileRow?.full_name ||
      userMeta.fullName ||
      userMeta.full_name ||
      cleanEmail.split("@")[0];
    // No fabricated business names: a user without a stored profile starts clean
    const businessName =
      profileRow?.business_name ||
      userMeta.businessName ||
      userMeta.business_name ||
      cleanEmail.split("@")[0];

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
    const role: UserRole =
      profileRow?.role || userMeta.role || userMeta.user_role || "publisher";

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
        user.email?.split("@")[0] ||
        "User",
      phone: profileRow?.phone || userMeta.phone,
      location: profileRow?.location || userMeta.shopLocation,
    };
  },

  /**
   * Fetch every registered press (press_owner profiles) so publishers can
   * choose which press an order goes to instead of a hardcoded default.
   */
  async fetchPresses(): Promise<string[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("business_name")
      .eq("role", "press_owner");
    if (error) return [];
    return (data || [])
      .map((p) => p.business_name)
      .filter((name): name is string => Boolean(name && name.trim()));
  },

  /**
   * Fetch every press's registered shop location, keyed by business name, so
   * invoices can print each party's full address instead of a hardcoded one.
   */
  async fetchPressLocations(): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from("profiles")
      .select("business_name, location")
      .eq("role", "press_owner");
    if (error) return {};
    const map: Record<string, string> = {};
    (data || []).forEach((p) => {
      if (p.business_name) map[p.business_name] = p.location || "";
    });
    return map;
  },
};