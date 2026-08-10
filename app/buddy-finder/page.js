"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";

export default function BuddyFinderPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [postType, setPostType] = useState("training");
  const [posts, setPosts] = useState([]);
  const [cityFilter, setCityFilter] = useState("");

  async function loadPosts(type) {
    let query = supabase
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

    const { data } = await query;
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

  const filteredPosts = cityFilter
    ? posts.filter((p) =>
        p.city.toLowerCase().includes(cityFilter.toLowerCase())
      )
    : posts;

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <Wordmark />

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
            className="btn-secondary"
            type="button"
            onClick={() => loadPosts(postType)}
            style={{ flex: "0 0 auto", padding: "10px 16px" }}
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
          filteredPosts.map((post) => (
            <div className="buddy-card" key={post.id}>
              {post.dogs?.photo_url && (
                <img src={post.dogs.photo_url} alt={post.dogs.name} />
              )}
              <div className="buddy-card-body">
                <div className="buddy-card-name">
                  {post.dogs?.name || "A dog"} —{" "}
                  {post.profiles?.display_name || "Someone"}
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
                <div className="buddy-card-message">{post.message}</div>
                {post.author_id !== userId && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ marginTop: 8, padding: "6px 14px", fontSize: 13 }}
                    onClick={() =>
                      router.push(`/start-conversation/${post.author_id}`)
                    }
                  >
                    Message
                  </button>
                )}
              </div>
            </div>
          ))
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
