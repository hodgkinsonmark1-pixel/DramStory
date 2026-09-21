import { NextResponse, type NextRequest } from "next/server";
import { findByToken, updateSubscriber } from "@/lib/newsletter";

/**
 * Leaving: one click, no login, no "are you sure" (21 Sep 2026).
 *
 * PECR requires a simple means of refusing further messages in every
 * one. Simple means simple - not a preference centre, not a sign-in, not
 * a survey about why. This route does the whole thing on the first
 * request and then says so.
 *
 * GET AND POST BOTH, and that is not sloppiness. The link in the email
 * is a GET because links are. Gmail's and Outlook's own unsubscribe
 * button uses the List-Unsubscribe headers and sends a POST, and honouring
 * that is what keeps a reader from reaching for "mark as spam" instead -
 * which costs the sending domain far more than losing one subscriber, and
 * that domain also carries the sign-in emails.
 *
 * THE TOKEN IS CLEARED, NOT REUSED. Once unsubscribed the link is spent,
 * so a forwarded or archived email cannot be used against the row again.
 * findByToken refuses an empty token for exactly this reason - otherwise
 * a request with no token at all would match every cleared row.
 *
 * THE ROW SURVIVES. Deleting it would make a later accidental re-add look
 * like a fresh signup. Status changes, the record of having left stays,
 * and coming back means confirming again like anyone else.
 */
async function unsubscribe(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") ?? "";

  try {
    const record = await findByToken(token);
    if (record && record.fields.Status !== "Unsubscribed") {
      await updateSubscriber(record.id, {
        Status: "Unsubscribed",
        Token: "",
        "Unsubscribed At": new Date().toISOString(),
      });
    }
  } catch (e) {
    /* Swallowed deliberately. Someone who has asked to stop hearing from
       us must never see a failure and be left wondering whether it took -
       they would either try again or complain, and a complaint is worse
       for the domain than a lost subscriber. Mark sees this in the logs
       and can clear the row by hand; the visitor sees "done". */
    console.error("newsletter/unsubscribe failed:", e);
  }

  return null;
}

export async function GET(request: NextRequest) {
  await unsubscribe(request);
  const home = new URL("/", request.url);
  home.searchParams.set("newsletter", "unsubscribed");
  return NextResponse.redirect(home);
}

/** One-click unsubscribe from the mail client's own button. It expects a
 *  plain 200 and shows the reader nothing, so there is nowhere to
 *  redirect to and no message to write. */
export async function POST(request: NextRequest) {
  await unsubscribe(request);
  return new NextResponse(null, { status: 200 });
}
