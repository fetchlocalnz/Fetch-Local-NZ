"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";
import HamburgerMenu from "../components/HamburgerMenu";

export default function MessagesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      const uid = userData.user.id;
      setUserId(uid);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("accepted_terms")
        .eq("id", uid)
        .single();
      if (!profileData?.accepted_terms) {
        router.push("/terms");
        return;
      }

      const { data: convos } = await supabase
        .from("conversations")
        .select(
          `
          id, user_one, user_two, hidden_by_user_one, hidden_by_user_two,
          shop_items ( title ),
          buddy_posts ( post_type, dogs ( name ) )
        `
        )
        .or(`user_one.eq.${uid},user_two.eq.${uid}`)
        .order("created_at", { ascending: false });

      // Skip conversations this person has hidden from their own inbox.
      const visible = (convos || []).filter((c) => {
        const isUserOne = c.user_one === uid;
        return isUserOne ? !c.hidden_by_user_one : !c.hidden_by_user_two;
      });

      // Fetch the other participant's name for each conversation.
      const withNames = await Promise.all(
        visible.map(async (c) => {
          const otherId = c.user_one === uid ? c.user_two : c.user_one;
          const { data: otherProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", otherId)
            .single();

          let contextLabel = null;
          if (c.shop_items?.title) {
            contextLabel = `🛍️ ${c.shop_items.title}`;
          } else if (c.buddy_posts?.dogs?.name) {
            const kind = c.buddy_posts.post_type === "training" ? "Training" : "Play";
            contextLabel = `🐾 ${c.buddy_posts.dogs.name} — ${kind}`;
          }

          return {
            ...c,
            otherName: otherProfile?.display_name || "Someone",
            contextLabel,
          };
        })
      );

      setConversations(withNames);
      setLoading(false);
    }
    init();
  }, []);

  async function handleHide(convo) {
    const confirmed = window.confirm(
      "Remove this conversation from your inbox? The other person will still see it."
    );
    if (!confirmed) return;

    const isUserOne = convo.user_one === userId;
    const field = isUserOne ? "hidden_by_user_one" : "hidden_by_user_two";

    await supabase
      .from("conversations")
      .update({ [field]: true })
      .eq("id", convo.id);

    setConversations((prev) => prev.filter((c) => c.id !== convo.id));
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="page-header">
          <HamburgerMenu />
          <Wordmark />
        </div>

        {loading ? (
          <p>Loading messages...</p>
        ) : conversations.length === 0 ? (
          <p>
            No conversations yet — head to Buddy Finder and message someone
            about a training or play post.
          </p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className="conversation-row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => router.push(`/messages/${c.id}`)}
            >
              <div>
                {c.contextLabel && (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      opacity: 0.75,
                      marginBottom: 2,
                    }}
                  >
                    {c.contextLabel}
                  </div>
                )}
                {c.otherName}
              </div>
              <button
                type="button"
                className="post-menu-btn"
                title="Remove from inbox"
                onClick={(e) => {
                  e.stopPropagation();
                  handleHide(c);
                }}
              >
                ✕
              </button>
            </div>
          ))
        )}

        <div className="top-nav" style={{ marginTop: 20 }}>
          <a href="/feed">Feed</a>
          <a href="/buddy-finder">Buddy Finder</a>
          <a href="/messages">Messages</a>
        </div>
      </div>
    </div>
  );
}
