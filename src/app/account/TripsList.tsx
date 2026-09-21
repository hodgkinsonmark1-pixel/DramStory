"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTrip } from "@/lib/trip-context";

export interface AccountTrip {
  id: string;
  name: string;
  dayCount: number;
  updatedAt: string;
}

/**
 * The named-trips library (5 Sep 2026).
 *
 * WHICH TRIP IS BEING EDITED lives in localStorage, not in the database,
 * and that is deliberate: it is a property of this browser, not of the
 * account. Someone with the site open on a laptop and a phone should be
 * able to work on different trips on each without one yanking the other
 * sideways. TripSync reads the same key.
 *
 * A SAVED DAY IS JUST A TRIP (Mark, 5 Sep 2026) - one with a single day
 * in it. No separate table, no separate list, no second concept to keep
 * in step. The day count below is the only thing that distinguishes
 * them, and it does not need to mean anything.
 */
export default function TripsList({ trips }: { trips: AccountTrip[] }) {
  const router = useRouter();
  const trip = useTrip();
  const [supabase] = useState(() => createClient());
  const [busy, setBusy] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open(id: string) {
    /* Through the context, not straight at localStorage (5 Sep 2026).
       Writing the key here and navigating moved a pointer nobody re-read:
       TripSync did not watch it, so /trip showed the trip you had just
       left and the next edit was written back over it. setActiveTrip
       writes the same key AND tells TripSync to go and fetch that row. */
    trip.setActiveTrip(id);
    router.push("/trip");
  }

  async function createTrip() {
    setBusy("new");
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(null);
      return;
    }
    const { data, error: insertError } = await supabase
      .from("trips")
      .insert({ user_id: user.id, name: "New trip", payload: {} })
      .select("id")
      .single();
    setBusy(null);
    if (insertError || !data) {
      setError("Couldn't create that trip. Try again in a moment.");
      return;
    }
    open(data.id);
  }

  async function saveName(id: string) {
    const name = draftName.trim() || "Untitled trip";
    setBusy(id);
    setError(null);
    const { error: updateError } = await supabase.from("trips").update({ name }).eq("id", id);
    setBusy(null);
    setRenaming(null);
    if (updateError) {
      setError("Couldn't rename that trip.");
      return;
    }
    router.refresh();
  }

  async function remove(id: string, name: string) {
    // Deleting a trip destroys work and cannot be undone, so it asks.
    // The only confirm in this flow, deliberately - everything else here
    // is reversible.
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    setBusy(id);
    setError(null);
    const { error: deleteError } = await supabase.from("trips").delete().eq("id", id);
    setBusy(null);
    if (deleteError) {
      setError("Couldn't delete that trip.");
      return;
    }
    // Deleting the trip you were editing leaves nothing to point at.
    if (trip.activeTripId === id) trip.setActiveTrip(null);
    router.refresh();
  }

  return (
    <>
      {error && <p className="login-error">{error}</p>}

      <ul className="account-trips">
        {trips.map((t) => (
          <li key={t.id} className="account-trip">
            <div className="account-trip-main">
              {renaming === t.id ? (
                <input
                  className="account-rename-input"
                  value={draftName}
                  autoFocus
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName(t.id);
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  onBlur={() => saveName(t.id)}
                  aria-label={`Rename ${t.name}`}
                />
              ) : (
                <span className="account-trip-name">{t.name}</span>
              )}
              <span className="account-trip-meta">
                {t.dayCount === 0
                  ? "No days yet"
                  : `${t.dayCount} ${t.dayCount === 1 ? "day" : "days"}`}
                {" · saved "}
                {new Date(t.updatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>

            <div className="account-trip-actions">
              <button type="button" className="account-trip-link" onClick={() => open(t.id)}>
                Open &rarr;
              </button>
              <button
                type="button"
                className="account-trip-action"
                disabled={busy === t.id}
                onClick={() => {
                  setRenaming(t.id);
                  setDraftName(t.name);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="account-trip-action account-trip-delete"
                disabled={busy === t.id}
                onClick={() => remove(t.id, t.name)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="trip-btn trip-btn-primary account-new-trip"
        onClick={createTrip}
        disabled={busy === "new"}
      >
        {busy === "new" ? "Creating…" : "+ New trip"}
      </button>
    </>
  );
}
