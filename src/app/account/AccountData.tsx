"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_KEY, ACTIVE_TRIP_KEY, TRIP_SYNCED_KEY } from "@/lib/trip-context";

/**
 * Your data: take it away, or delete it (17 Sep 2026).
 *
 * UK GDPR Article 20 (portability) and Article 17 (erasure). Both are
 * rights a visitor can exercise without asking, which is the point -
 * "email us and we will consider it" is a worse answer than a button,
 * and the statutory clock for a written request is one month.
 *
 * EXPORT RUNS IN THE BROWSER. Row level security already scopes the
 * query to the signed-in user, so no server route is needed and no key
 * beyond the publishable one. It downloads what the database actually
 * holds - not a summary, not a rendering - because the point of
 * portability is that another service could read it.
 *
 * DELETION GOES TO A SERVER ROUTE, because the email address lives in
 * auth.users and no client key can touch that. See
 * src/app/api/account/delete/route.ts.
 *
 * THE CONFIRMATION IS TYPED, not a checkbox and not a window.confirm.
 * Deleting an account is the only irreversible thing on this site: the
 * trips go with it by database cascade, and nothing here is recoverable
 * afterwards. A dialog you dismiss by reflex is not consent to that.
 */
export default function AccountData({ email }: { email: string }) {
  const [supabase] = useState(() => createClient());
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CONFIRM_PHRASE = "delete my account";

  async function exportData() {
    setExporting(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("trips")
      .select("id, name, payload, created_at, updated_at")
      .order("created_at", { ascending: true });

    setExporting(false);

    if (fetchError) {
      setError("Couldn't put your data together just now. Try again in a moment.");
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      account: { email },
      trips: data ?? [],
      /* Said plainly inside the file, because someone opening it in six
         months will not have this page in front of them. */
      note: "This is everything DramStory holds about you: your email address and your saved trips. A trip built in a browser and never signed in to is not here, because it never reached us.",
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dramstory-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoked on the next tick: revoking synchronously can cancel the
    // download in some browsers before it has started reading the blob.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function deleteAccount() {
    setDeleting(true);
    setError(null);

    const res = await fetch("/api/account/delete", { method: "POST" });

    if (!res.ok) {
      setDeleting(false);
      const body = await res.json().catch(() => ({}));
      setError(
        body.error === "not-configured"
          ? "Account deletion isn't available right now. Nothing has been deleted — please email us and we'll do it by hand."
          : "We couldn't delete your account just now. Nothing has been deleted — try again in a moment."
      );
      return;
    }

    /* The account is gone, so the local copy of the trip is no longer a
       cache of anything - clear it rather than leave the next visitor to
       this browser looking at a deleted person's itinerary. */
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(ACTIVE_TRIP_KEY);
      window.localStorage.removeItem(TRIP_SYNCED_KEY);
    } catch {
      // Storage blocked. The account is still deleted, which is the part
      // that matters.
    }

    // Full reload rather than router.push: every cached server component
    // on this tab was rendered for a user who no longer exists.
    window.location.href = "/?deleted=1";
  }

  return (
    <section className="account-data">
      <h2 className="account-data-title">Your data</h2>

      {error && <p className="login-error">{error}</p>}

      <div className="account-data-row">
        <div>
          <strong>Download everything we hold</strong>
          <p className="account-data-note">
            Your email address and every saved trip, as a JSON file.
          </p>
        </div>
        <button
          type="button"
          onClick={exportData}
          className="account-data-btn"
          disabled={exporting}
        >
          {exporting ? "Preparing…" : "Download"}
        </button>
      </div>

      <div className="account-data-row">
        <div>
          <strong>Delete your account</strong>
          <p className="account-data-note">
            Your account and every trip in it, gone for good. This cannot be
            undone and we cannot get them back for you.
          </p>
        </div>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="account-data-btn account-data-btn-danger"
          >
            Delete
          </button>
        )}
      </div>

      {confirming && (
        <div className="account-delete-confirm">
          <p>
            Type <strong>{CONFIRM_PHRASE}</strong> below to confirm. Everything
            goes at once, including trips you have not opened in months.
          </p>
          <input
            type="text"
            className="account-delete-input"
            value={typed}
            autoFocus
            onChange={(e) => setTyped(e.target.value)}
            aria-label={`Type "${CONFIRM_PHRASE}" to confirm`}
            placeholder={CONFIRM_PHRASE}
          />
          <div className="account-delete-actions">
            <button
              type="button"
              onClick={deleteAccount}
              className="account-data-btn account-data-btn-danger"
              disabled={typed.trim().toLowerCase() !== CONFIRM_PHRASE || deleting}
            >
              {deleting ? "Deleting…" : "Delete my account for good"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setTyped("");
                setError(null);
              }}
              className="account-delete-cancel"
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
