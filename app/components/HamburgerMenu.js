"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";

export default function HamburgerMenu() {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    async function checkUnread() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const uid = userData.user.id;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("notifications_last_checked_at")
        .eq("id", uid)
        .single();

      const lastChecked =
        profileData?.notifications_last_checked_at || "2020-01-01";

      // Unread likes on my own posts
      const { data: myPosts } = await supabase
        .from("posts")
        .select("id")
        .eq("author_id", uid);
      const myPostIds = (myPosts || []).map((p) => p.id);

      let unreadLikes = 0;
      if (myPostIds.length > 0) {
        const { count } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .in("post_id", myPostIds)
          .neq("user_id", uid)
          .gt("created_at", lastChecked);
        unreadLikes = count || 0;
      }

      // Unread messages sent to me
      const { data: convos } = await supabase
        .from("conversations")
        .select("id")
        .or(`user_one.eq.${uid},user_two.eq.${uid}`);
      const convoIds = (convos || []).map((c) => c.id);

      let unreadMessages = 0;
      if (convoIds.length > 0) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", convoIds)
          .neq("sender_id", uid)
          .gt("created_at", lastChecked);
        unreadMessages = count || 0;
      }

      setHasUnread(unreadLikes + unreadMessages > 0);
    }
    checkUnread();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <button
        type="button"
        className="hamburger-btn"
        onClick={() => setOpen(true)}
        aria-label="Menu"
      >
        ☰
        {hasUnread && <span className="hamburger-badge">🐾</span>}
      </button>

      {open && (
        <div className="hamburger-overlay" onClick={() => setOpen(false)}>
          <div
            className="hamburger-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="hamburger-close"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>

            <a
              href="/profile"
              className="hamburger-link"
              onClick={() => setOpen(false)}
            >
              Your profile
            </a>
            <a
              href="/notifications"
              className="hamburger-link"
              onClick={() => setOpen(false)}
            >
              Notifications {hasUnread && "🐾"}
            </a>
            <a
              href="/shop"
              className="hamburger-link"
              onClick={() => setOpen(false)}
            >
              Shop
            </a>

            <div className="hamburger-spacer" />

            <button
              type="button"
              className="hamburger-logout"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
