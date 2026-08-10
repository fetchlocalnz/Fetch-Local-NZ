"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";

function DogEditCard({ dog, userId, supabase, onSaved }) {
  const [dogName, setDogName] = useState(dog.name || "");
  const [breed, setBreed] = useState(dog.breed || "");
  const [age, setAge] = useState(dog.age || "");
  const [energyLevel, setEnergyLevel] = useState(dog.energy_level || "medium");
  const [recallReliable, setRecallReliable] = useState(
    dog.recall_reliable ? "yes" : "no"
  );
  const [bio, setBio] = useState(dog.bio || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(dog.photo_url || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);

    let photoUrl = dog.photo_url || null;
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

    const { error: updateError } = await supabase
      .from("dogs")
      .update({
        name: dogName,
        breed: breed || null,
        age: age ? parseInt(age, 10) : null,
        energy_level: energyLevel,
        recall_reliable: recallReliable === "yes",
        bio: bio || null,
        photo_url: photoUrl,
      })
      .eq("id", dog.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    onSaved();
  }

  return (
    <form
      onSubmit={handleSave}
      style={{
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 16,
        marginBottom: 18,
      }}
    >
      {error && <div className="error-box">{error}</div>}
      {saved && <div className="success-box">Saved!</div>}

      <div className="field">
        <label>Photo</label>
        {photoPreview && (
          <img
            src={photoPreview}
            alt={dogName}
            style={{
              width: "100%",
              maxHeight: 160,
              objectFit: "cover",
              borderRadius: 12,
              marginBottom: 10,
            }}
          />
        )}
        <input type="file" accept="image/*" onChange={handlePhotoChange} />
      </div>

      <div className="field">
        <label>Name</label>
        <input
          type="text"
          required
          value={dogName}
          onChange={(e) => setDogName(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Breed</label>
        <input
          type="text"
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Age (years)</label>
        <input
          type="number"
          min="0"
          max="30"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Energy level</label>
        <select
          value={energyLevel}
          onChange={(e) => setEnergyLevel(e.target.value)}
        >
          <option value="low">Low - chill and relaxed</option>
          <option value="medium">Medium - up for walks and play</option>
          <option value="high">High - needs to run</option>
        </select>
      </div>

      <div className="field">
        <label>Reliable off-leash recall?</label>
        <select
          value={recallReliable}
          onChange={(e) => setRecallReliable(e.target.value)}
        >
          <option value="yes">Yes</option>
          <option value="no">No - stays on lead</option>
        </select>
      </div>

      <div className="field">
        <label>A little about your dog</label>
        <textarea
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      <button className="btn-primary" type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}

export default function ManageDogsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadDogs(uid) {
    const { data } = await supabase
      .from("dogs")
      .select("*")
      .eq("owner_id", uid)
      .order("created_at", { ascending: true });
    setDogs(data || []);
  }

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      setUserId(userData.user.id);
      await loadDogs(userData.user.id);
      setLoading(false);
    }
    init();
  }, []);

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <Wordmark />
        {loading ? (
          <p>Loading your dogs...</p>
        ) : (
          <>
            {dogs.length === 0 && <p>No dogs saved yet.</p>}
            {dogs.map((dog) => (
              <DogEditCard
                key={dog.id}
                dog={dog}
                userId={userId}
                supabase={supabase}
                onSaved={() => loadDogs(userId)}
              />
            ))}
            <button
              className="btn-secondary"
              type="button"
              onClick={() => router.push("/feed")}
            >
              Back to profile
            </button>
          </>
        )}
      </div>
    </div>
  );
}
