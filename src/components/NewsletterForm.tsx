"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

/**
 * The signup that finally does something (21 Sep 2026).
 *
 * WHAT WAS THERE BEFORE. An <input> and a <button type="submit"> with no
 * form around them and no handler on either. Clicking Subscribe did
 * literally nothing - no request, no message, no error. It sat on every
 * page of the site through launch. That is worse than having no signup
 * at all: somebody who wants to hear from you goes away believing they
 * will, and never does.
 *
 * WHY IT IS A REAL <form>. Enter should submit it. A button that only
 * responds to a mouse click excludes anyone working by keyboard, and the
 * previous markup could not submit at all because the two elements were
 * never wrapped in anything.
 *
 * THE SAME MESSAGE WHETHER OR NOT AN EMAIL GOES OUT, and this is
 * deliberate rather than vague. The route behind it treats an already
 * subscribed address as a no-op precisely so that a stranger cannot type
 * your address into the footer and learn whether you subscribe. If this
 * form said "you're already on the list" it would hand back exactly the
 * answer the route refuses to give. So: "check your email", always.
 */
export default function NewsletterForm() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot - see below
  const [state, setState] = useState<"idle" | "sending" | "sent" | "invalid" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website, source: pathname }),
      });
      if (res.ok) {
        setState("sent");
        setEmail("");
      } else {
        const body = await res.json().catch(() => ({}));
        setState(body.error === "invalid-email" ? "invalid" : "error");
      }
    } catch {
      /* Offline, or the request never left. Distinct from a server error
         only in cause, not in what the reader should do about it. */
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <p className="newsletter-result" role="status">
        <strong>Check your email.</strong> There&rsquo;s a link in it to confirm &mdash;
        we won&rsquo;t send anything else until you click it.
      </p>
    );
  }

  return (
    <form className="footer-newsletter-row" onSubmit={onSubmit} noValidate>
      {/* HONEYPOT. Hidden from sight, from screen readers and from
          autofill; no human ever knows it exists. Bots fill every input
          they find, so a submission carrying a value here is automated
          and the route drops it. Cheaper and less hostile than a CAPTCHA,
          which asks real people to prove themselves and, per this
          project's rules, is not something to automate around either. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
        <label htmlFor="nl-website">Leave this empty</label>
        <input
          id="nl-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <label htmlFor="nl-email" className="sr-only">
        Your email address
      </label>
      <input
        id="nl-email"
        className="footer-newsletter-input"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state !== "idle") setState("idle");
        }}
        aria-invalid={state === "invalid"}
      />
      <button className="footer-newsletter-btn" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Subscribe"}
      </button>

      {state === "invalid" && (
        <p className="newsletter-error" role="alert">
          That doesn&rsquo;t look like an email address.
        </p>
      )}
      {state === "error" && (
        <p className="newsletter-error" role="alert">
          Something went wrong our end. Try again in a moment.
        </p>
      )}
    </form>
  );
}
