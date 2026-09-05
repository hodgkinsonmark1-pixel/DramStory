import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import TripsList, { type AccountTrip } from "./TripsList";
import SignOutButton from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "Your trips — DramStory",
  description: "The trips saved to your DramStory account.",
  robots: { index: false, follow: false },
};

/**
 * The signed-in home (5 Sep 2026).
 *
 * WHY IT EXISTS: signing in landed on /login saying "You're signed in"
 * and nothing else. Mark's reaction was the right one - he expected to
 * see his trips. An account whose only visible effect is a sentence
 * confirming it exists has not paid for itself.
 *
 * Server component, so the trips are fetched with the visitor's own
 * session and RLS decides what comes back. There is no filter by user_id
 * in the query below and there does not need to be: the policies on the
 * table already restrict every select to auth.uid(). If that were ever
 * wrong, adding a filter here would hide the fault rather than fix it.
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/account");

  const { data: trips, error } = await supabase
    .from("trips")
    .select("id, name, payload, updated_at")
    .order("updated_at", { ascending: false });

  /* Logged, not swallowed. This page said "We couldn't load your trips
     just now" for a table that had never been granted to the Data API,
     and the message gave Mark nothing to act on - he reasonably guessed
     it was a session problem across two windows. A vague error in the UI
     is fine; a vague error in the logs is not. */
  if (error) {
    console.error("[account] could not load trips:", error.message, error.code ?? "");
  }

  return (
    <>
      <PageHeader />
      <main className="account-page">
        <div className="account-inner">
          <div className="login-eyebrow">Your account</div>
          <h1 className="login-title">Your trips</h1>
          <p className="account-signed-as">
            Signed in as <strong>{user.email}</strong>
          </p>

          {error && (
            <p className="login-error">
              We couldn&rsquo;t load your trips just now. They&rsquo;re safe
              &mdash; try again in a moment.
            </p>
          )}

          {!error && (!trips || trips.length === 0) && (
            <div className="account-empty">
              <p>
                Nothing saved yet. Build a trip and it will appear here, on every
                device you sign in to.
              </p>
              <Link href="/" className="trip-btn trip-btn-primary account-cta">
                Start planning
              </Link>
            </div>
          )}

          {!error && trips && trips.length > 0 && (
            <TripsList
              trips={trips.map((t): AccountTrip => {
                /* payload is jsonb, so nothing about its shape is
                   guaranteed. Counted defensively - a trip saved by an
                   older version of the site should still list, not break
                   the page. */
                const payload = (t.payload ?? {}) as { days?: unknown[] };
                return {
                  id: t.id,
                  name: t.name,
                  dayCount: Array.isArray(payload.days) ? payload.days.length : 0,
                  updatedAt: t.updated_at,
                };
              })}
            />
          )}

          <SignOutButton />
        </div>
      </main>
      <Footer />
    </>
  );
}
