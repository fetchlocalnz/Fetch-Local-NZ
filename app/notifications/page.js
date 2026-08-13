"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";
import HamburgerMenu from "../components/HamburgerMenu";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      const uid = userData.user.id;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("accepted_terms")
        .eq("id", uid)
        .single();
      if (!profileData?.accepted_terms) {
        router.push("/terms");
        return;
      }

      // Likes on my posts
      const { data: myPosts } = await supabase
        .from("posts")
        .select("id, caption")
        .eq("author_id", uid);
      const myPostIds = (myPosts || []).map((p) => p.id);
      const postById = Object.fromEntries(
        (myPosts || []).map((p) => [p.id, p.caption])
      );

      let likeItems = [];
      if (myPostIds.length > 0) {
        const { data: likesData } = await supabase
          .from("likes")
          .select("id, created_at, post_id, profiles ( display_name )")
          .in("post_id", myPostIds)
          .neq("user_id", uid)
          .order("created_at", { ascending: false });

        likeItems = (likesData || []).map((l) => ({
          type: "like",
          id: `like-${l.id}`,
          created_at: l.created_at,
          text: `${l.profiles?.display_name || "Someone"} liked your post${
            postById[l.post_id] ? `: "${postById[l.post_id]}"` : ""
          }`,
          href: "/feed",
        }));
      }

      // Messages sent to me
      const { data: convos } = await supabase
        .from("conversations")
        .select("id")
        .or(`user_one.eq.${uid},user_two.eq.${uid}`);
      const convoIds = (convos || []).map((c) => c.id);

      let messageItems = [];
      if (convoIds.length > 0) {
        const { data: messagesData } = await supabase
          .from("messages")
          .select(
            "id, created_at, content, conversation_id, sender_id, profiles ( display_name )"
          )
          .in("conversation_id", convoIds)
          .neq("sender_id", uid)
          .order("created_at", { ascending: false });

        messageItems = (messagesData || []).map((m) => ({
          type: "message",
          id: `msg-${m.id}`,
          created_at: m.created_at,
          text: `${m.profiles?.display_name || "Someone"}: "${m.content}"`,
          href: `/messages/${m.conversation_id}`,
        }));
      }

      const combined = [...likeItems, ...messageItems].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setItems(combined);
      setLoading(false);

      // Mark everything as read now that they've opened this page.
      await supabase
        .from("profiles")
        .update({ notifications_last_checked_at: new Date().toISOString() })
        .eq("id", uid);
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
          <p>Loading notifications...</p>
        ) : items.length === 0 ? (
          <p>Nothing here yet — likes and messages will show up here.</p>
        ) : (
          items.map((item) => (
            <a key={item.id} className="notification-row" href={item.href}>
              {item.type === "like" ? "🐾 " : "💬 "}
              {item.text}
              <div className="notification-time">
                {timeAgo(item.created_at)}
              </div>
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
