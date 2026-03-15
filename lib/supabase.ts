/**
 * lib/supabase.ts
 *
 * Server-side Supabase client using the service role key.
 * Used exclusively for Storage operations (image uploads).
 * Never expose this client or its key to the browser.
 */

import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }
  return createClient(url, key);
}

export const supabase = getSupabaseClient();

export const STORAGE_BUCKET = "product-images";
