import { NextResponse, type NextRequest } from "next/server";
import { confirmEmail, sendEmail } from "@/lib/email";
import {
  createPending,
  findByEmail,
  looksLikeEmail,
  newToken,
  updateSubscriber,
} from "@/lib/newsletter";

/**
 * Step one of double opt-in: take an address, send it a confirmation,
 * and tell the visitor nothing they did not already know (21 Sep 2026).
 *
 * THE SAME ANSWER EVERY TIME, and this is the important bit. Whether the
 * address is new, already pending, already subscribed or previously
 * unsubscribed, this route returns the identical response. Anything else
 * turns a public endpoint into an oracle: type an address, read the
 * reply, learn whether that person subscribes to DramStory. That is
 * somebody else's personal data being disclosed to a stranger, and the
 * fact that the stranger had to guess the address first does not make it
 * acceptable. The branching all happens on the server, silently.
 *
 * WHAT ACTUALLY HAPPENS PER CASE:
 *   - no row            -> create Pending, send the confirmation
 *   - Pending           -> new token, resend. Covers the common case of
 *                          the first email going to spam or being deleted
 *                          by accident.
 *   - Confirmed         -> nothing at all. They are already subscribed;
 *                          re-confirming would be noise, and a stranger
 *                          typing their address should not be able to
 *                          make their inbox ring.
 *   - Unsubscribed      -> back to Pending with a fresh token and a
 *                          confirmation. Someone who left and returned
 *                          proves it again like anyone else; we never
 *                          silently resurrect a subscription.
 *
 * WHY POST AND NOT GET. A GET that writes can be fired by a prefetch, an
 * image tag on another site, or a link scanner in someone's mail client.
 */
export async function POST(request: NextRequest) {
  let body: { email?: unknown; source?: unknown; website?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  /* HONEYPOT. `website` is a field no human ever sees or fills - it is
     hidden in the form and left empty. Bots fill every input they find,
     so anything arriving with it populated is automated. Answer 200 and
     do nothing: telling a bot it failed only teaches it to try again
     differently. */
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const source = typeof body.source === "string" ? body.source.slice(0, 200) : "";

  if (!looksLikeEmail(email)) {
    /* The one case where a different answer is right: this is about what
       they typed, not about who exists, so it leaks nothing. */
    return NextResponse.json({ error: "invalid-email" }, { status: 400 });
  }

  const ok = NextResponse.json({ ok: true });

  try {
    const existing = await findByEmail(email);

    if (existing?.fields.Status === "Confirmed") return ok;

    const token = newToken();

    if (!existing) {
      await createPending(email, token, source);
    } else {
      await updateSubscriber(existing.id, {
        Status: "Pending",
        Token: token,
        "Requested At": new Date().toISOString(),
        Source: source,
      });
    }

    const base = new URL(request.url).origin;
    const message = confirmEmail(`${base}/api/newsletter/confirm?token=${encodeURIComponent(token)}`);
    await sendEmail({ to: email, ...message });

    return ok;
  } catch (e) {
    /* Logged, not surfaced. The visitor gets the neutral success message
       either way - partly because the failure is ours rather than theirs,
       and partly because a distinguishable error response reopens the
       oracle this route is built to avoid. Mark sees it in the Vercel
       logs, and the absent row is the real symptom. */
    console.error("newsletter/subscribe failed:", e);
    return ok;
  }
}
