"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { normalizePhotoFile } from "../../lib/photo-helpers";
import Wordmark from "../components/Wordmark";

const FREE_DOG_LIMIT = 2;

export default function AddDogPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dogCount, setDogCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [energyLevel, setEnergyLevel] = useState("medium");
  const [recallReliable, setRecallReliable] = useState("yes");
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [convertingPhoto, setConvertingPhoto] = useState(false);

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

  useEffect(() => {
    async function load() {
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

      const { count } = await supabase
        .from("dogs")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", userData.user.id);

      setIsPremium(profileData?.is_premium || false);
      setDogCount(count || 0);
      setLoading(false);
    }
    load();
  }, []);

  const atLimit = !isPremium && dogCount >= FREE_DOG_LIMIT;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!dogName.trim()) {
      setError("Your dog needs a name!");
      return;
    }

    setSaving(true);

    let photoUrl = null;
    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("dog-photos")
        .upload(filePath, photoFile);

      if (uploadError) {
        setSaving(false);
        setError("Photo upload failed: " + uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("dog-photos")
        .getPublicUrl(filePath);
      photoUrl = publicUrlData.publicUrl;
    }

    const { error: dogError } = await supabase.from("dogs").insert({
      owner_id: userId,
      name: dogName,
      breed: breed || null,
      age: age ? parseInt(age, 10) : null,
      energy_level: energyLevel,
      recall_reliable: recallReliable === "yes",
      bio: bio || null,
      photo_url: photoUrl,
    });
    setSaving(false);

    if (dogError) {
      setError(dogError.message);
      return;
    }

    router.push("/profile");
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

  if (atLimit) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <Wordmark />
          <div className="error-box">
            Free accounts can add up to {FREE_DOG_LIMIT} dogs. Upgrade to
            Fetch Local+ to add more.
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
            onClick={() => router.push("/profile")}
            style={{ marginTop: 10 }}
          >
            Back to profile
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
                  maxHeight: 180,
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
            <label htmlFor="dogName">Dog's name</label>
            <input
              id="dogName"
              type="text"
              required
              value={dogName}
              onChange={(e) => setDogName(e.target.value)}
              placeholder="e.g. Bean"
            />
          </div>
          <div className="field">
            <label htmlFor="breed">Breed</label>
            <input
              id="breed"
              type="text"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="e.g. Staffy cross"
            />
          </div>
          <div className="field">
            <label htmlFor="age">Age (years)</label>
            <input
              id="age"
              type="number"
              min="0"
              max="30"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>
          <div className="field">
            <label htmlFor="energyLevel">Energy level</label>
            <select
              id="energyLevel"
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value)}
            >
              <option value="low">Low - chill and relaxed</option>
              <option value="medium">Medium - up for walks and play</option>
              <option value="high">High - needs to run</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="recall">Reliable off-leash recall?</label>
            <select
              id="recall"
              value={recallReliable}
              onChange={(e) => setRecallReliable(e.target.value)}
            >
              <option value="yes">Yes</option>
              <option value="no">No - stays on lead</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="bio">A little about your dog</label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Friendly with other dogs, loves the beach..."
            />
          </div>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Add dog"}
          </button>
        </form>
      </div>
    </div>
  );
}
