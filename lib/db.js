import { createClient } from "@supabase/supabase-js";

let supabaseClient;

export function connectDB() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY must be defined in environment variables.");
  }

  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false
    }
  });

  return supabaseClient;
}

export function disconnectDB() {
  supabaseClient = undefined;
}
