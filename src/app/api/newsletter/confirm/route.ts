import { NextResponse, type NextRequest } from "next/server";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { findByToken, newToken, updateSubscriber } from "@/lib/newsletter";

/**
 * Step two: the click that turns a claim into consent (21 Sep 2026).
 *
 * THIS REQUEST IS THE CONSENT RECORD. Under UK GDPR and PECR, what makes
 * marketing email lawful is that the person asked for it and that you can
 * show they did. `Confirmed At` is that showing. Everything else in the
 * table is administration; this timestamp is the evidence.
 *
 * WHY THE TOKEN IS ROTATED HERE. The confirmation link gets forwarded,
 * pasted into chats, and indexed by whatever scans people's mailboxes.
 * If the same token stayed valid it would remain a live unsubscribe link
 * for that person forever. Rotating it on confirm means the confirmation
 * email is spent the moment it works, and the only surviving token is the
 * one in the welcome email.
 *
 * WHY GET, when the sibling route insists on POST. Because this one is a
 * link in an email, and a link is a GET - there is no other option. The
 * protections are different in kind: the token is unguessable, it is
 * consumed on use, and the action it performs is one a mail scanner
 * following links on the recipient's behalf would be doing at the
 * recipient's own request anyway.
 */
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const home = new URL("/", request.url);

  try {
    const record = await findByToken(token);

    /* No match means an expired, already-used or invented token. Send
       them to the homepage with the same marker a success gets. Two
       reasons: a stranger poking at tokens learns nothing from the
       response, and someone who clicked their own link twice sees
       "you're subscribed" rather than an error about something that
       actually worked the first time. */
    if (!record) {
      home.searchParams.set("newsletter", "confirmed");
      return NextResponse.redirect(home);
    }

    if (record.fields.Status !== "Confirmed") {
      const fresh = newToken();
      await updateSubscriber(record.id, {
        Status: "Confirmed",
        Token: fresh,
        "Confirmed At": new Date().toISOString(),
      });

      const unsubscribeUrl = `${new URL(request.url).origin}/api/newsletter/unsubscribe?token=${encodeURIComponent(fresh)}`;
      const message = welcomeEmail(unsubscribeUrl);
      await sendEmail({ to: record.fields.Email ?? "", ...message, unsubscribeUrl });
    }

    home.searchParams.set("newsletter", "confirmed");
    return NextResponse.redirect(home);
  } catch (e) {
    console.error("newsletter/confirm failed:", e);
    home.searchParams.set("newsletter", "error");
    return NextResponse.redirect(home);
  }
}
