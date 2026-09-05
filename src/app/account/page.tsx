import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

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
            <ul className="account-trips">
              {trips.map((t) => {
                /* payload is jsonb, so nothing about its shape is
                   guaranteed. Counted defensively rather than trusted -
                   a trip saved by an older version of the site should
                   still list, not crash the page. */
                const payload = (t.payload ?? {}) as { days?: unknown[] };
                const dayCount = Array.isArray(payload.days) ? payload.days.length : 0;
                return (
                  <li key={t.id} className="account-trip">
                    <div className="account-trip-main">
                      <span className="account-trip-name">{t.name}</span>
                      <span className="account-trip-meta">
                        {dayCount === 0
                          ? "No days yet"
                          : `${dayCount} ${dayCount === 1 ? "day" : "days"}`}
                        {" · saved "}
                        {new Date(t.updated_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                    </div>
                    <Link href="/trip" className="account-trip-link">
                      Open &rarr;
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <form action="/auth/sign-out" method="post" className="account-signout">
            <button type="submit" className="account-signout-btn">
              Sign out
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
