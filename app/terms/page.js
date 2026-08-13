"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";

export default function TermsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      setUserId(userData.user.id);
      setLoading(false);
    }
    init();
  }, []);

  async function handleAccept() {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ accepted_terms: true })
      .eq("id", userId);
    router.push("/feed");
  }

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <Wordmark />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Wordmark />
        <div
          className="disclaimer-box"
          style={{ maxHeight: 340, overflowY: "auto", textAlign: "left" }}
        >
          <strong>Terms &amp; Conditions</strong>
          <p>
            Please read this before continuing. By tapping "I agree" below,
            you're accepting these terms.
          </p>

          <p>
            <strong>Your account &amp; details.</strong> The information you
            provide (like your name, city, and your dogs' details) is stored
            securely and used to run Fetch Local's features — profiles,
            matching, and messaging. If paid features are introduced, any
            payment details are handled directly by our payment provider and
            are never stored by Fetch Local.
          </p>

          <p>
            <strong>Photos and videos.</strong> Anything you post — including
            photos and videos of yourself or your dog — may be used by Fetch
            Local for promotional purposes, including on social media and in
            advertising. Don't post anything you wouldn't want shared
            publicly this way.
          </p>

          <p>
            <strong>Buying and selling secondhand items.</strong> The Shop
            connects buyers and sellers directly — Fetch Local isn't involved
            in payment, shipping, or the condition of items. Any transaction,
            meetup, or exchange arranged through the Shop is done entirely at
            your own risk and between you and the other person.
          </p>

          <p>
            <strong>Meeting other dog owners.</strong> Fetch Local doesn't
            verify users, dogs, or their behaviour. Dog control rules vary
            between NZ councils — you'll see more detail on this before
            messaging someone for the first time. Meetups arranged through
            the app are your own responsibility.
          </p>

          <p>
            <strong>General.</strong> Be respectful of other users. We may
            remove content or restrict accounts that don't follow this. This
            is a plain-English summary, not a formal legal document.
          </p>
        </div>

        <button
          className="btn-primary"
          type="button"
          onClick={handleAccept}
          disabled={saving}
        >
          {saving ? "Saving..." : "I agree, continue"}
        </button>
      </div>
    </div>
  );
}
