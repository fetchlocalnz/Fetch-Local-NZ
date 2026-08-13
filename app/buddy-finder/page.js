"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";
import HamburgerMenu from "../components/HamburgerMenu";

export default function BuddyFinderPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [postType, setPostType] = useState("training");
  const [posts, setPosts] = useState([]);
  const [cityFilter, setCityFilter] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editText, setEditText] = useState("");

  async function loadPosts(type) {
    const { data } = await supabase
      .from("buddy_posts")
      .select(
        `
        id, message, city, created_at, author_id,
        profiles ( display_name ),
        dogs ( name, photo_url, energy_level, recall_reliable )
      `
      )
      .eq("post_type", type)
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
      setUserId(userData.user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("accepted_terms")
        .eq("id", userData.user.id)
        .single();
      if (!profileData?.accepted_terms) {
        router.push("/terms");
        return;
      }

      await loadPosts(postType);
      setLoading(false);
    }
    init();
  }, []);

  async function handleToggle(type) {
    setPostType(type);
    setLoading(true);
    await loadPosts(type);
    setLoading(false);
  }

  async function handleDelete(postId) {
    setMenuOpenId(null);
    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) return;
    await supabase.from("buddy_posts").delete().eq("id", postId);
    await loadPosts(postType);
  }

  function startEdit(post) {
    setMenuOpenId(null);
    setEditingPostId(post.id);
    setEditText(post.message);
  }

  function cancelEdit() {
    setEditingPostId(null);
    setEditText("");
  }

  async function saveEdit(postId) {
    await supabase
      .from("buddy_posts")
      .update({ message: editText })
      .eq("id", postId);
    setEditingPostId(null);
    setEditText("");
    await loadPosts(postType);
  }

  const filteredPosts = cityFilter
    ? posts.filter((p) =>
        p.city.toLowerCase().includes(cityFilter.toLowerCase())
      )
    : posts;

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="page-header">
          <HamburgerMenu />
          <Wordmark />
        </div>

        <div className="leash-toggle">
          <button
            type="button"
            className={postType === "training" ? "active" : ""}
            onClick={() => handleToggle("training")}
          >
            Training
          </button>
          <button
            type="button"
            className={postType === "play" ? "active" : ""}
            onClick={() => handleToggle("play")}
          >
            Play
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            className="btn-primary"
            type="button"
            onClick={() => router.push("/create-buddy-post")}
            style={{ flex: 1 }}
          >
            + Post a {postType === "training" ? "training" : "play"} request
          </button>
          <button
            className="icon-btn"
            type="button"
            onClick={() => loadPosts(postType)}
            title="Refresh"
          >
            ↻
          </button>
        </div>

        <div className="field">
          <label htmlFor="cityFilter">Filter by city</label>
          <input
            id="cityFilter"
            type="text"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="e.g. Christchurch"
          />
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredPosts.length === 0 ? (
          <p>
            No {postType} posts {cityFilter ? "in that area " : ""}yet — be
            the first!
          </p>
        ) : (
          filteredPosts.map((post) => {
            const isMine = post.author_id === userId;
            return (
              <div className="buddy-card" key={post.id}>
                {post.dogs?.photo_url && (
                  <img src={post.dogs.photo_url} alt={post.dogs.name} />
                )}
                <div className="buddy-card-body" style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div className="buddy-card-name">
                      {post.dogs?.name || "A dog"} —{" "}
                      {post.profiles?.display_name || "Someone"}
                    </div>
                    {isMine && (
                      <div className="post-menu-wrap">
                        <button
                          type="button"
                          className="post-menu-btn"
                          onClick={() =>
                            setMenuOpenId(
                              menuOpenId === post.id ? null : post.id
                            )
                          }
                        >
                          ⋮
                        </button>
                        {menuOpenId === post.id && (
                          <div className="post-menu-dropdown">
                            <button
                              type="button"
                              onClick={() => startEdit(post)}
                            >
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
                  <div className="buddy-card-meta">
                    {post.city}
                    {post.dogs?.energy_level
                      ? ` • ${post.dogs.energy_level} energy`
                      : ""}
                    {post.dogs?.recall_reliable !== undefined
                      ? post.dogs.recall_reliable
                        ? " • reliable recall"
                        : " • stays on lead"
                      : ""}
                  </div>

                  {editingPostId === post.id ? (
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
                  ) : (
                    <div className="buddy-card-message">{post.message}</div>
                  )}

                  {!isMine && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{
                        marginTop: 8,
                        padding: "6px 14px",
                        fontSize: 13,
                      }}
                      onClick={() =>
                        router.push(
                          `/start-conversation/${post.author_id}?buddyPostId=${post.id}`
                        )
                      }
                    >
                      Message
                    </button>
                  )}
                </div>
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
