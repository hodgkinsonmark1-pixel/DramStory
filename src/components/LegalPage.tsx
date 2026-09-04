import PageHeader from "./PageHeader";
import Footer from "./Footer";
import { LEGAL_DETAILS, LEGAL_READY, LEGAL_HAS_PLACEHOLDERS } from "@/lib/legal-details";

/**
 * The shared shell for the four legal pages (4 Sep 2026): privacy,
 * terms, cookies, affiliate disclosure.
 *
 * One component because these four have to look and behave the same -
 * they are read as a set, usually by someone checking whether this site
 * is trustworthy, and four slightly different treatments would answer
 * that question badly.
 *
 * THE DRAFT BANNER is deliberately loud and deliberately at the top. If
 * anyone reaches these pages before the facts are filled in and a
 * solicitor has read them, they should not mistake them for the real
 * thing - and neither should we.
 */
export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader />

      {(!LEGAL_READY || LEGAL_HAS_PLACEHOLDERS) && (
        <div className="legal-draft-banner" role="note">
          <strong>Draft — not in force.</strong> This page has not been finalised
          or legally reviewed, and still contains details to be confirmed. It is
          published here for review only. See <code>docs/legal/</code> and{" "}
          <code>src/lib/legal-details.ts</code>.
        </div>
      )}

      <main className="legal-page">
        <h1 className="legal-title">{title}</h1>
        {intro && <p className="legal-intro">{intro}</p>}
        <p className="legal-updated">Last updated: {LEGAL_DETAILS.lastUpdated}</p>
        <div className="legal-body">{children}</div>
      </main>

      <Footer />
    </>
  );
}

/** Renders a value from LEGAL_DETAILS, making an unfilled one obvious on
 *  the page rather than letting "TO CONFIRM" read as normal prose. */
export function Detail({ value }: { value: string }) {
  if (value.includes("TO CONFIRM")) {
    return <span className="legal-todo">[to confirm]</span>;
  }
  return <>{value}</>;
}
