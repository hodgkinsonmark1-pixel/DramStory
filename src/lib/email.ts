/**
 * Sending email from the site's own code, for the first time (21 Sep 2026).
 *
 * WHY THIS DID NOT EXIST BEFORE. The magic-link and password emails come
 * from Supabase, which holds its own SMTP settings and templates - the
 * site never had to send anything itself. The newsletter is the first
 * thing that does, so this is the whole of DramStory's outbound email.
 *
 * WHY A SEPARATE FROM ADDRESS. newsletter@ rather than whatever Supabase
 * sends auth from, at Mark's instruction. Marketing mail attracts spam
 * complaints in a way transactional mail does not, and reputation damage
 * follows the sending address. Keeping them apart means a bad week for
 * the newsletter cannot stop people signing in.
 *
 * WHY PLAIN TEXT AND HTML BOTH. A text/plain part is not a courtesy - a
 * message with no text alternative scores worse with spam filters, and
 * the confirmation email is the one message in this system that must
 * arrive or nothing else happens.
 */

const FROM = "DramStory <newsletter@dramstory.com>";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Goes into the List-Unsubscribe headers. Gmail and Outlook surface it
   *  as their own one-click unsubscribe, which is both a requirement for
   *  bulk senders and the best protection there is against someone
   *  reaching for "mark as spam" instead. */
  unsubscribeUrl?: string;
}

export async function sendEmail({ to, subject, html, text, unsubscribeUrl }: SendArgs) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    /* Refuse rather than pretend. A caller that believes a confirmation
       went out when it did not leaves someone waiting forever for an
       email that was never sent. */
    console.error("email: RESEND_API_KEY is not set - nothing was sent.");
    return { ok: false as const, reason: "not-configured" as const };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html,
      text,
      ...(unsubscribeUrl
        ? {
            headers: {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }
        : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`email: Resend ${res.status} - ${body}`);
    return { ok: false as const, reason: "send-failed" as const };
  }

  return { ok: true as const };
}

/* ─────────────────────────────────────────────────────────────────────
   The two messages.

   Written as ordinary sentences rather than a template with a headline,
   a hero image and three buttons. A confirmation email has one job and
   one link; anything else in it is a reason to hesitate over the only
   click that matters. Inline styles only - every email client strips a
   <style> block, and half of them mangle a stylesheet link.
   ───────────────────────────────────────────────────────────────────── */

const WRAP =
  'font-family:Georgia,"Times New Roman",serif;font-size:16px;line-height:1.6;color:#1A3A4A;max-width:520px;margin:0 auto;padding:32px 24px;';
const BUTTON =
  "display:inline-block;background:#1A3A4A;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;";
const QUIET = "font-size:13px;line-height:1.6;color:#6B7A80;";

export function confirmEmail(confirmUrl: string) {
  return {
    subject: "Confirm your DramStory subscription",
    text: [
      "Someone - hopefully you - asked for the DramStory Journal.",
      "",
      "Confirm here and we'll start sending it:",
      confirmUrl,
      "",
      "If it wasn't you, ignore this. Nothing happens until that link is clicked, and we won't email you again.",
    ].join("\n"),
    html: `<div style="${WRAP}">
  <p>Someone &mdash; hopefully you &mdash; asked for the DramStory Journal: whisky
  adventures, distillery stories and itineraries for Islay and Jura, once a month.</p>
  <p style="margin:28px 0;"><a href="${confirmUrl}" style="${BUTTON}">Yes, sign me up &rarr;</a></p>
  <p style="${QUIET}">If it wasn&rsquo;t you, just ignore this. Nothing happens until
  that link is clicked, and we won&rsquo;t email you again.</p>
</div>`,
  };
}

export function welcomeEmail(unsubscribeUrl: string) {
  return {
    subject: "You're on the list",
    text: [
      "That's you confirmed. The DramStory Journal arrives once a month.",
      "",
      "Islay and Jura: distilleries, the days between them, and the practical things nobody tells you until you're there.",
      "",
      "Plan a trip: https://dramstory.com",
      "",
      "Unsubscribe any time, one click, no questions: " + unsubscribeUrl,
    ].join("\n"),
    html: `<div style="${WRAP}">
  <p>That&rsquo;s you confirmed. The DramStory Journal arrives once a month &mdash;
  Islay and Jura, the distilleries, the days between them, and the practical
  things nobody tells you until you&rsquo;re standing there.</p>
  <p style="margin:28px 0;"><a href="https://dramstory.com" style="${BUTTON}">Start planning a trip &rarr;</a></p>
  <p style="${QUIET}">Changed your mind? <a href="${unsubscribeUrl}" style="color:#6B7A80;">Unsubscribe</a>
  &mdash; one click, no questions, no &ldquo;are you sure&rdquo;.</p>
</div>`,
  };
}
