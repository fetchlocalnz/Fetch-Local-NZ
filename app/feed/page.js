"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";
import HamburgerMenu from "../components/HamburgerMenu";

export default function FeedPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editText, setEditText] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);

  async function loadPosts() {
    const { data } = await supabase
      .from("posts")
      .select(
        `
        id, caption, photo_url, created_at, author_id,
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

  async function handleDelete(postId) {
    setMenuOpenId(null);
    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) return;
    await supabase.from("posts").delete().eq("id", postId);
    await loadPosts();
  }

  function startEdit(post) {
    setMenuOpenId(null);
    setEditingPostId(post.id);
    setEditText(post.caption || "");
  }

  function cancelEdit() {
    setEditingPostId(null);
    setEditText("");
  }

  async function saveEdit(postId) {
    await supabase
      .from("posts")
      .update({ caption: editText })
      .eq("id", postId);
    setEditingPostId(null);
    setEditText("");
    await loadPosts();
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="page-header">
          <HamburgerMenu />
          <Wordmark />
        </div>

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
            className="icon-btn"
            type="button"
            onClick={loadPosts}
            title="Refresh"
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
            const isMine = post.author_id === userId;
            return (
              <div className="post-card" key={post.id}>
                <div className="post-card-header">
                  <div className="post-author">
                    {post.profiles?.display_name || "Someone"}
                    {post.profiles?.city ? ` — ${post.profiles.city}` : ""}
                    {post.dogs?.name && (
                      <span className="post-dog-tag">{post.dogs.name}</span>
                    )}
                  </div>
                  {isMine && (
                    <div className="post-menu-wrap">
                      <button
                        type="button"
                        className="post-menu-btn"
                        onClick={() =>
                          setMenuOpenId(menuOpenId === post.id ? null : post.id)
                        }
                      >
                        ⋮
                      </button>
                      {menuOpenId === post.id && (
                        <div className="post-menu-dropdown">
                          <button type="button" onClick={() => startEdit(post)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {post.photo_url && (
                  <img
                    src={post.photo_url}
                    alt="Post"
                    className="post-photo"
                  />
                )}

                {post.caption && editingPostId !== post.id && (
                  <div className="post-caption">{post.caption}</div>
                )}

                {editingPostId === post.id && (
                  <div className="field">
                    <textarea
                      rows={3}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: "6px 14px", fontSize: 13 }}
                        onClick={() => saveEdit(post.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: "6px 14px", fontSize: 13 }}
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
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
        </div>
      </div>
    </div>
  );
}
