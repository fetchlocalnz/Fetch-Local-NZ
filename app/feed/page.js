"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";

export default function FeedPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [posts, setPosts] = useState([]);

  async function loadPosts() {
    const { data } = await supabase
      .from("posts")
      .select(
        `
        id, caption, photo_url, created_at,
        profiles ( display_name, city ),
        dogs ( name ),
        likes ( user_id )
      `
      )
      .order("created_at", { ascending: false });
    setPosts(data || []);
  }

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      // First-time users without a completed profile go finish setup first.
      if (!profileData) {
        router.push("/onboarding");
        return;
      }

      setUserId(userData.user.id);
      await loadPosts();
      setLoading(false);
    }
    init();
  }, []);

  async function toggleLike(post) {
    const alreadyLiked = post.likes.some((l) => l.user_id === userId);

    if (alreadyLiked) {
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", userId);
    } else {
      await supabase.from("likes").insert({
        post_id: post.id,
        user_id: userId,
      });
    }
    await loadPosts();
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <Wordmark />

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button
            className="btn-primary"
            type="button"
            onClick={() => router.push("/create-post")}
            style={{ flex: 1 }}
          >
            + New post
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={loadPosts}
            style={{ flex: "0 0 auto", padding: "10px 16px" }}
          >
            ↻
          </button>
        </div>

        {loading ? (
          <p>Loading feed...</p>
        ) : posts.length === 0 ? (
          <p>No posts yet — be the first to share something!</p>
        ) : (
          posts.map((post) => {
            const liked = post.likes.some((l) => l.user_id === userId);
            return (
              <div className="post-card" key={post.id}>
                <div className="post-author">
                  {post.profiles?.display_name || "Someone"}
                  {post.profiles?.city ? ` — ${post.profiles.city}` : ""}
                  {post.dogs?.name && (
                    <span className="post-dog-tag">{post.dogs.name}</span>
                  )}
                </div>
                {post.photo_url && (
                  <img
                    src={post.photo_url}
                    alt="Post"
                    className="post-photo"
                  />
                )}
                {post.caption && (
                  <div className="post-caption">{post.caption}</div>
                )}
                <button
                  type="button"
                  className={`like-btn ${liked ? "liked" : ""}`}
                  onClick={() => toggleLike(post)}
                >
                  🐾 {liked ? "Liked" : "Like"} ({post.likes.length})
                </button>
              </div>
            );
          })
        )}

        <div className="top-nav" style={{ marginTop: 20 }}>
          <a href="/feed">Feed</a>
          <a href="/buddy-finder">Buddy Finder</a>
          <a href="/messages">Messages</a>
          <a href="/profile">Your profile</a>
        </div>
      </div>
    </div>
  );
}
