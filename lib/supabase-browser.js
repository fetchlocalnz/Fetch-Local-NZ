import { createBrowserClient } from "@supabase/ssr";

// This connects the app to your Supabase project from the browser.
// The two values below are safe to be public — they come from
// environment variables you'll set in Vercel, not hardcoded here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
