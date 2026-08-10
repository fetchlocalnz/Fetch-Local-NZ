"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { normalizePhotoFile } from "../../lib/photo-helpers";
import Wordmark from "../components/Wordmark";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);

  // Step 1 - the human
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");

  // Step 2 - the dog
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
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.push("/login");
      } else {
        setUserId(data.user.id);
      }
    });
  }, []);

  function goToStepTwo(e) {
    e.preventDefault();
    setError("");
    if (!displayName.trim() || !city.trim()) {
      setError("Fill in your name and city to continue.");
      return;
    }
    setStep(2);
  }

  async function finishOnboarding(e) {
    e.preventDefault();
    setError("");

    if (!dogName.trim()) {
      setError("Your dog needs a name!");
      return;
    }

    setLoading(true);

    // 1. Save the human's profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: displayName,
      city: city,
    });

    if (profileError) {
      setLoading(false);
      setError(profileError.message);
      return;
    }

    // 2. Save the dog
    let photoUrl = null;
    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("dog-photos")
        .upload(filePath, photoFile);

      if (uploadError) {
        setLoading(false);
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

    setLoading(false);

    if (dogError) {
      setError(dogError.message);
      return;
    }

    router.push("/profile");
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Wordmark />
        <div className="step-dots">
          <div className={`step-dot ${step === 1 ? "active" : ""}`} />
          <div className={`step-dot ${step === 2 ? "active" : ""}`} />
        </div>

        {error && <div className="error-box">{error}</div>}

        {step === 1 && (
          <form onSubmit={goToStepTwo}>
            <div className="field">
              <label htmlFor="displayName">Your name</label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How other owners will see you"
              />
            </div>
            <div className="field">
              <label htmlFor="city">Your city</label>
              <input
                id="city"
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Christchurch"
              />
            </div>
            <div className="helper-text">
              This helps match you with buddies nearby.
            </div>
            <button className="btn-primary" type="submit">
              Next: add your dog
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={finishOnboarding}>
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
                placeholder="e.g. Rosie"
              />
            </div>
            <div className="field">
              <label htmlFor="breed">Breed</label>
              <input
                id="breed"
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="e.g. Border Collie cross"
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
                placeholder="e.g. 3"
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
            <div className="helper-text">
              Some council off-leash areas require reliable recall by law —
              this helps other owners plan meetups safely.
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
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Finish setup"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
