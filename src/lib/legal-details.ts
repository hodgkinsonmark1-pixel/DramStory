/**
 * The identity and contact facts the four legal pages render from
 * (4 Sep 2026; rewritten 16 Sep 2026 for a sole trader).
 *
 * ONE FILE, so that filling in the blanks is one job rather than four,
 * and so the same fact cannot end up different on two pages.
 *
 * NOT A LIMITED COMPANY. The first version of this file assumed
 * DramStory Ltd, with a Companies House number and a registered office.
 * Neither exists: DramStory is Mark Hodgkinson trading as DramStory, and
 * a sole trader has no company number and is not "registered in" a
 * jurisdiction the way a company is.
 *
 * That is not a cosmetic difference. UK GDPR requires the data
 * CONTROLLER to be identified, and for a sole trader the controller is
 * the individual - there is no separate legal person to name instead. So
 * the trader's own name appears on the privacy policy, because nothing
 * else would satisfy the requirement.
 */

export const LEGAL_DETAILS = {
  /** The controller. A person, not a company - see above. */
  traderName: "Mark Hodgkinson",
  /** The name the site trades under, used wherever the brand rather than
   *  the legal person is the natural subject. */
  tradingAs: "DramStory",
  /** How the two are stated together where the law wants the operator
   *  named. */
  legalName: "Mark Hodgkinson, trading as DramStory",
  /** Governing law of the Terms. Mark's choice, 16 Sep 2026 - not
   *  inferred from the address. */
  jurisdiction: "England and Wales",
  /** Business address. A c/o accountant's address is a normal and
   *  sufficient business address for a sole trader; a home address is
   *  not required and should not be used. */
  businessAddress: "c/o GTA Accounting, Johnsons Barns, Waterworks Rd, Petersfield GU32 2BY",
  /** A real monitored inbox. Used for data requests, which carry a
   *  one-month statutory deadline - do not point it somewhere nobody
   *  reads. */
  contactEmail: "privacy@dramstory.com",
  /** ICO registration number, once registered - Tier 1, £52/year.
   *
   *  NULL IS A LEGITIMATE STATE HERE, and deliberately not "TO CONFIRM".
   *  Publishing the number is good practice, not a legal requirement, so
   *  its absence does not hold up publication. What IS required is the
   *  registration itself, before the first personal data is processed
   *  commercially - which for this site means before accounts go live.
   *  The privacy page omits the line entirely while this is null rather
   *  than printing an empty one. See docs/to-do.md. */
  icoNumber: null as string | null,
  /** Published date, shown on each page. */
  /* 21 Sep 2026. Moved because the policy genuinely changed rather than
     to look current: the 16 Sep text was written against a site with no
     accounts and said so in as many words - "no account", "we never see
     it". Accounts went live on the 21st and made those sentences false,
     which is the one thing a privacy notice cannot be. Supabase, Resend
     and the newsletter were all added to it the same day. */
  lastUpdated: "21 September 2026",
} as const;

/**
 * Flip to true when the facts above are real and the pages have been
 * read through.
 *
 * Mark's call, 16 Sep 2026: no solicitor review before this stage. The
 * exposure he is accepting is the liability section of the Terms, which
 * the Consumer Rights Act limits in ways a draft cannot be certain of -
 * an unenforceable exclusion does not create liability, it just fails to
 * prevent it.
 *
 * Flipping it does three things at once: removes the draft banner,
 * removes noindex, and lights up the footer links.
 */
export const LEGAL_READY = true;

/** True while any placeholder remains - warns in the draft banner even
 *  if LEGAL_READY gets flipped early by mistake. icoNumber is excluded:
 *  null there is a real, expected state rather than an unfilled blank. */
export const LEGAL_HAS_PLACEHOLDERS = Object.values(LEGAL_DETAILS).some(
  (v) => typeof v === "string" && v.includes("TO CONFIRM")
);
