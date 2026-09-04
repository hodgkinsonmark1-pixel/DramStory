"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Magic-link sign-in (4 Sep 2026).
 *
 * No password field, because there is no password. Nothing to hash,
 * reset, leak or remember - which matters when the whole site is run by
 * one person.
 *
 * There is no separate "register": the first time an address is used,
 * the account is created. A visitor should not have to know whether they
 * already have one, and asking them is a question we can answer
 * ourselves.
 *
 * The same-address response either way is also the point at which not
 * leaking matters: telling someone "no account with that email" tells
 * anyone who asks which addresses are registered here.
 */
export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setState("error");
      setMessage("That doesn't look like an email address.");
      return;
    }

    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setState("error");
      setMessage("We couldn't send that just now. Try again in a moment.");
      return;
    }

    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="login-sent">
        <h2 className="login-sent-title">Check your email</h2>
        <p>
          We&rsquo;ve sent a link to <strong>{email.trim()}</strong>. Open it on
          this device and you&rsquo;ll be signed in.
        </p>
        <p className="login-note">
          Nothing arrived? Check spam, then{" "}
          <button
            type="button"
            className="login-link-btn"
            onClick={() => {
              setState("idle");
              setMessage("");
            }}
          >
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label htmlFor="login-email" className="login-label">
        Your email
      </label>
      <input
        id="login-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        className="login-input"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === "error") setState("idle");
        }}
        disabled={state === "sending"}
      />

      {state === "error" && <p className="login-error">{message}</p>}

      <button type="submit" className="hero-action-btn hero-action-primary login-submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me a link"}
      </button>

      <p className="login-note">
        No password. We&rsquo;ll email you a link that signs you in. If
        you&rsquo;ve not been here before, this creates your account.
      </p>
    </form>
  );
}
