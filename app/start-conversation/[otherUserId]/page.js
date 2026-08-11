"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase-browser";
import Wordmark from "../../components/Wordmark";

export default function StartConversationPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const otherUserId = params.otherUserId;
  const shopItemId = searchParams.get("shopItemId");
  const buddyPostId = searchParams.get("buddyPostId");
  const supabase = createClient();

  const [userId, setUserId] = useState(null);
  const [needsDisclaimer, setNeedsDisclaimer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function goToConversation(uid) {
    // Look for an existing conversation between these two people
    // (checking both possible orderings), or create a new one.
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(user_one.eq.${uid},user_two.eq.${otherUserId}),and(user_one.eq.${otherUserId},user_two.eq.${uid})`
      )
      .maybeSingle();

    const contextUpdate = {};
    if (shopItemId) contextUpdate.shop_item_id = shopItemId;
    if (buddyPostId) contextUpdate.buddy_post_id = buddyPostId;

    if (existing) {
      if (Object.keys(contextUpdate).length > 0) {
        await supabase
          .from("conversations")
          .update(contextUpdate)
          .eq("id", existing.id);
      }
      router.push(`/messages/${existing.id}`);
      return;
    }

    const { data: created, error: createError } = await supabase
      .from("conversations")
      .insert({ user_one: uid, user_two: otherUserId, ...contextUpdate })
      .select("id")
      .single();

    if (createError) {
      setError(createError.message);
      return;
    }

    router.push(`/messages/${created.id}`);
  }

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      const uid = userData.user.id;
      setUserId(uid);

      if (uid === otherUserId) {
        setError("You can't message yourself!");
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("accepted_meet_disclaimer")
        .eq("id", uid)
        .single();

      if (profileData?.accepted_meet_disclaimer) {
        await goToConversation(uid);
      } else {
        setNeedsDisclaimer(true);
        setLoading(false);
      }
    }
    init();
  }, []);

  async function handleAccept() {
    setLoading(true);
    await supabase
      .from("profiles")
      .update({ accepted_meet_disclaimer: true })
      .eq("id", userId);
    await goToConversation(userId);
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

  if (error) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <Wordmark />
          <div className="error-box">{error}</div>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => router.push("/buddy-finder")}
          >
            Back to Buddy Finder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Wordmark />
        <div className="disclaimer-box">
          <strong>Before you message someone</strong>
          <p>
            Dog control rules — including leash requirements, off-leash
            areas, and recall standards — vary between city and district
            councils across New Zealand. What's allowed in one area may not
            be allowed in another.
          </p>
          <p>
            Before meeting up, please check the current rules for your
            council and agree between yourselves on a suitable location.
            Fetch Local doesn't verify individual users, dogs, or compliance
            with local bylaws — that's between you and whoever you're
            meeting.
          </p>
          <p>This is general information, not legal advice.</p>
        </div>
        <button className="btn-primary" type="button" onClick={handleAccept}>
          I understand, continue
        </button>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => router.push("/buddy-finder")}
          style={{ marginTop: 10 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
