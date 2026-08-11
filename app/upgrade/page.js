"use client";

import { useRouter } from "next/navigation";
import Wordmark from "../components/Wordmark";

export default function UpgradePage() {
  const router = useRouter();

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Wordmark />
        <div className="success-box">
          Fetch Local+ is coming soon — unlimited dogs, advanced search
          filters, priority placement, and message read receipts.
        </div>
        <div className="helper-text">
          Payment isn't connected yet. This page is a placeholder until
          Stripe billing is built.
        </div>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => router.push("/profile")}
        >
          Back to profile
        </button>
      </div>
    </div>
  );
}
