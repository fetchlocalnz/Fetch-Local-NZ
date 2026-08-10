"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";

export default function FeedPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [dogs, setDogs] = useState([]);

  useEffect(() => {
    async function load() {
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

      // If there's no profile yet (e.g. they confirmed their email in a
      // fresh browser session and never finished the signup form),
      // send them to onboarding instead of showing an empty feed.
      if (!profileData) {
        router.push("/onboarding");
        return;
      }

      const { data: dogsData } = await supabase
        .from("dogs")
        .select("*")
        .eq("owner_id", userData.user.id);

      setProfile(profileData);
      setDogs(dogsData || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Wordmark />
        {loading ? (
          <p>Loading your profile...</p>
        ) : (
          <>
            <div className="success-box">
              Your account is set up and connected to Supabase.
            </div>
            <div className="field">
              <label>Owner</label>
              <p>{profile?.display_name} — {profile?.city}</p>
            </div>
            <div className="field">
              <label>{dogs.length === 1 ? "Your dog" : "Your dogs"}</label>
              {dogs.length === 0 && <p>No dog saved yet.</p>}
              {dogs.map((dog) => (
                <div key={dog.id} style={{ marginBottom: 10 }}>
                  {dog.photo_url && (
                    <img
                      src={dog.photo_url}
                      alt={dog.name}
                      style={{
                        width: "100%",
                        maxHeight: 180,
                        objectFit: "cover",
                        borderRadius: 12,
                        marginBottom: 6,
                      }}
                    />
                  )}
                  <p style={{ margin: 0 }}>
                    {dog.name} — {dog.breed || "breed not set"} —{" "}
                    {dog.energy_level} energy —{" "}
                    {dog.recall_reliable ? "reliable recall" : "stays on lead"}
                  </p>
                </div>
              ))}
            </div>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => router.push("/add-dog")}
              style={{ marginBottom: 10 }}
            >
              Add another dog
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => router.push("/manage-dogs")}
              style={{ marginBottom: 12 }}
            >
              Edit your dogs / add photos
            </button>
            <button className="btn-secondary" type="button" onClick={handleLogout}>
              Log out
            </button>
            <div className="top-nav" style={{ marginTop: 20 }}>
              <a href="/feed">Feed</a>
              <a href="/profile">Your profile</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
