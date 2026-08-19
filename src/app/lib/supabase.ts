import { createClient } from "@supabase/supabase-js";

// Retrieve environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[PressPact Warning] Supabase credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing from your environment. Please configure your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
