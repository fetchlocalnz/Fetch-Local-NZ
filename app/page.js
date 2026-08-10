"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase-browser";

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        router.push("/feed");
      } else {
        router.push("/login");
      }
    });
  }, []);

  return null;
}
