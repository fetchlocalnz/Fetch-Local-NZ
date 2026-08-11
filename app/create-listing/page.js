"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { normalizePhotoFile } from "../../lib/photo-helpers";
import Wordmark from "../components/Wordmark";

export default function CreateListingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", userData.user.id)
        .single();
      setIsPremium(profileData?.is_premium || false);
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

    if (!title.trim()) {
      setError("Give your item a title.");
      return;
    }

    setSaving(true);

    let photoUrl = null;
    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("shop-photos")
        .upload(filePath, photoFile);

      if (uploadError) {
        setSaving(false);
        setError("Photo upload failed: " + uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("shop-photos")
        .getPublicUrl(filePath);
      photoUrl = publicUrlData.publicUrl;
    }

    const { error: insertError } = await supabase.from("shop_items").insert({
      seller_id: userId,
      title,
      description: description || null,
      price: price ? parseFloat(price) : null,
      photo_url: photoUrl,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/shop");
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

  if (!isPremium) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <Wordmark />
          <div className="error-box">
            Listing items requires Fetch Local+.
          </div>
          <button
            className="btn-primary"
            type="button"
            onClick={() => router.push("/upgrade")}
          >
            See Fetch Local+
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => router.push("/shop")}
            style={{ marginTop: 10 }}
          >
            Back to shop
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

          <div className="field">
            <label htmlFor="title">Item title</label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Medium size harness, barely used"
            />
          </div>

          <div className="field">
            <label htmlFor="price">Price (NZD, optional)</label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 25"
            />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Condition, size, why you're selling..."
            />
          </div>

          <div className="helper-text">
            Payment and pickup are arranged directly between you and the
            buyer through messages.
          </div>

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Posting..." : "List item"}
          </button>
        </form>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => router.push("/shop")}
          style={{ marginTop: 10 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
