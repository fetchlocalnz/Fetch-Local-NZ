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
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      const userId = userData.user.id;

      const { data: convos } = await supabase
        .from("conversations")
        .select(
          `
          id, user_one, user_two,
          shop_items ( title ),
          buddy_posts ( post_type, dogs ( name ) )
        `
        )
        .or(`user_one.eq.${userId},user_two.eq.${userId}`)
        .order("created_at", { ascending: false });

      // Fetch the other participant's name for each conversation.
      const withNames = await Promise.all(
        (convos || []).map(async (c) => {
          const otherId = c.user_one === userId ? c.user_two : c.user_one;
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
            <a
              key={c.id}
              className="conversation-row"
              href={`/messages/${c.id}`}
            >
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
            </a>
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
