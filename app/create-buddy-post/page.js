"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";

export default function CreateBuddyPostPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [postType, setPostType] = useState("training");
  const [dogId, setDogId] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");

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
        .select("city")
        .eq("id", userData.user.id)
        .single();
      if (profileData?.city) setCity(profileData.city);

      const { data: dogsData } = await supabase
        .from("dogs")
        .select("id, name")
        .eq("owner_id", userData.user.id);
      setDogs(dogsData || []);
      if (dogsData && dogsData.length > 0) setDogId(dogsData[0].id);

      setLoading(false);
    }
    init();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!message.trim() || !city.trim() || !dogId) {
      setError("Fill in your dog, city, and message before posting.");
      return;
    }

    setSaving(true);
    const { error: postError } = await supabase.from("buddy_posts").insert({
      author_id: userId,
      dog_id: dogId,
      post_type: postType,
      message,
      city,
    });
    setSaving(false);

    if (postError) {
      setError(postError.message);
      return;
    }

    router.push("/buddy-finder");
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

  if (dogs.length === 0) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <Wordmark />
          <div className="error-box">
            You'll need to add a dog to your profile before posting here.
          </div>
          <button
            className="btn-primary"
            type="button"
            onClick={() => router.push("/add-dog")}
          >
            Add a dog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Wordmark />
        <form onSubmit={handleSubmit}>
          {error && <div className="error-box">{error}</div>}

          <div className="leash-toggle">
            <button
              type="button"
              className={postType === "training" ? "active" : ""}
              onClick={() => setPostType("training")}
            >
              Training
            </button>
            <button
              type="button"
              className={postType === "play" ? "active" : ""}
              onClick={() => setPostType("play")}
            >
              Play
            </button>
          </div>

          <div className="field">
            <label htmlFor="dog">Which dog?</label>
            <select
              id="dog"
              value={dogId}
              onChange={(e) => setDogId(e.target.value)}
            >
              {dogs.map((dog) => (
                <option key={dog.id} value={dog.id}>
                  {dog.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="city">City / area</label>
            <input
              id="city"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Christchurch"
            />
          </div>

          <div className="field">
            <label htmlFor="message">
              What are you looking for?
            </label>
            <textarea
              id="message"
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                postType === "training"
                  ? "Looking for a calm, recall-trained dog to help with reactivity training..."
                  : "Keen for a regular hiking or beach buddy on weekends..."
              }
            />
          </div>

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Posting..." : "Post"}
          </button>
        </form>
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
