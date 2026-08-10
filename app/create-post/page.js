"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { normalizePhotoFile } from "../../lib/photo-helpers";
import Wordmark from "../components/Wordmark";

export default function CreatePostPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [caption, setCaption] = useState("");
  const [dogId, setDogId] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [convertingPhoto, setConvertingPhoto] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      setUserId(userData.user.id);

      const { data: dogsData } = await supabase
        .from("dogs")
        .select("id, name")
        .eq("owner_id", userData.user.id);
      setDogs(dogsData || []);
      setLoading(false);
    }
    init();
  }, []);

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setConvertingPhoto(true);
    try {
      const normalized = await normalizePhotoFile(file);
      setPhotoFile(normalized);
      setPhotoPreview(URL.createObjectURL(normalized));
    } catch (err) {
      setError("Couldn't process that photo — try a different one.");
    }
    setConvertingPhoto(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!caption.trim() && !photoFile) {
      setError("Add a caption or a photo before posting.");
      return;
    }

    setSaving(true);

    let photoUrl = null;
    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("post-photos")
        .upload(filePath, photoFile);

      if (uploadError) {
        setSaving(false);
        setError("Photo upload failed: " + uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("post-photos")
        .getPublicUrl(filePath);
      photoUrl = publicUrlData.publicUrl;
    }

    const { error: postError } = await supabase.from("posts").insert({
      author_id: userId,
      dog_id: dogId || null,
      caption: caption || null,
      photo_url: photoUrl,
    });

    setSaving(false);

    if (postError) {
      setError(postError.message);
      return;
    }

    router.push("/feed");
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

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Wordmark />
        <form onSubmit={handleSubmit}>
          {error && <div className="error-box">{error}</div>}

          <div className="field">
            <label htmlFor="caption">What's happening?</label>
            <textarea
              id="caption"
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Beach run this morning, anyone keen next week?"
            />
          </div>

          {dogs.length > 0 && (
            <div className="field">
              <label htmlFor="dog">Tag a dog (optional)</label>
              <select
                id="dog"
                value={dogId}
                onChange={(e) => setDogId(e.target.value)}
              >
                <option value="">No dog tagged</option>
                {dogs.map((dog) => (
                  <option key={dog.id} value={dog.id}>
                    {dog.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="photo">Photo (optional)</label>
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Preview"
                style={{
                  width: "100%",
                  maxHeight: 220,
                  objectFit: "cover",
                  borderRadius: 12,
                  marginBottom: 10,
                }}
              />
            )}
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />
            {convertingPhoto && (
              <div className="helper-text">Processing photo...</div>
            )}
          </div>

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Posting..." : "Post"}
          </button>
        </form>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => router.push("/feed")}
          style={{ marginTop: 10 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
