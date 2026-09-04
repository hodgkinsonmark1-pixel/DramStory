import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import LoginForm from "./LoginForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in — DramStory",
  description: "Sign in to keep your trip, on every device.",
  // Nothing to index: it is a form, and signed-in visitors are bounced.
  robots: { index: false, follow: true },
};

/**
 * /login (4 Sep 2026), replacing the "Accounts are on the way"
 * coming-soon page that has stood here since the site launched.
 *
 * Says what an account is FOR before asking for anything. "Create an
 * account" is a cost; "your trip, on your phone, on the island" is the
 * reason to pay it - and the reason is the part that was missing while
 * this was a placeholder.
 */
export default async function LoginPage({
  searchParams,
}: {
  // Async in Next 16 - see the searchParams docs in
  // node_modules/next/dist/docs.
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <PageHeader />
      <main className="login-page">
        {user ? (
          <div className="login-panel">
            <div className="login-eyebrow">Signed in</div>
            <h1 className="login-title">You&rsquo;re signed in</h1>
            <p>
              As <strong>{user.email}</strong>. Your trip is saved to this
              account.
            </p>
            <form action="/auth/sign-out" method="post">
              <button type="submit" className="hero-action-btn hero-action-secondary login-submit">
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="login-panel">
            <div className="login-eyebrow">Keep your trip</div>
            <h1 className="login-title">Your trip, on every device</h1>
            <p className="login-lede">
              Right now the trip you build lives in this browser. Clear your
              history and it&rsquo;s gone, and it isn&rsquo;t on your phone when
              you&rsquo;re standing on Islay.
            </p>
            <p className="login-lede">
              Sign in and it follows you.
            </p>

            {params.error === "link-expired" && (
              <p className="login-error">
                That link had expired or had already been used. Links last one
                hour and work once &mdash; here&rsquo;s a fresh one.
              </p>
            )}
            {params.error === "missing-code" && (
              <p className="login-error">
                Something was missing from that link. Try again below.
              </p>
            )}

            <LoginForm next={next} />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
