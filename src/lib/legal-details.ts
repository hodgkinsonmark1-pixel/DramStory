/**
 * The company and contact facts the four legal pages render from
 * (4 Sep 2026).
 *
 * ONE FILE, so that filling in the blanks is one job rather than four,
 * and so the same company number cannot end up different on two pages.
 *
 * WHY THE PAGES ARE NOT LIVE YET: see LEGAL_READY below. A privacy
 * policy is a legal representation to visitors about what is done with
 * their data. Publishing one with placeholder text in it is worse than
 * publishing nothing, because it is a statement the operator can be held
 * to. So the pages exist, build, and can be reviewed at their URLs - but
 * they are noindex and unlinked until the facts are real and a solicitor
 * has read them.
 */

/** Every one of these must be filled before LEGAL_READY can be true. */
export const LEGAL_DETAILS = {
  companyName: "DramStory Ltd",
  /** TODO(mark): Companies House number */
  companyNumber: "TO CONFIRM",
  /** TODO(mark): "England and Wales" or "Scotland" - must match the
   *  jurisdiction named in the Terms, so this drives both. */
  jurisdiction: "TO CONFIRM",
  /** TODO(mark): registered office address */
  registeredAddress: "TO CONFIRM",
  /** TODO(mark): a real monitored inbox. Used for data requests, which
   *  carry a one-month statutory deadline - do not point it somewhere
   *  nobody reads. */
  contactEmail: "TO CONFIRM",
  /** TODO(mark): ICO registration number, once registered. Tier 1, £52.
   *  Required before the first email address is stored - see
   *  docs/to-do.md. */
  icoNumber: "TO CONFIRM",
  /** Reviewed and published date, shown on each page. */
  lastUpdated: "TO CONFIRM",
} as const;

/**
 * Flip to true ONLY when all of the following are true:
 *
 *   1. Every "TO CONFIRM" above is filled in
 *   2. A solicitor has reviewed all four pages - particularly the
 *      liability section of the Terms, which the Consumer Rights Act
 *      limits in ways a draft should not be trusted on
 *   3. The ICO registration exists, if any personal data is being
 *      collected by then
 *
 * Flipping it does three things at once: removes the draft banner,
 * removes noindex, and lights up the footer links. Nothing else needs
 * touching.
 */
export const LEGAL_READY = false;

/** True while any placeholder remains - used to warn in the draft banner
 *  even if someone flips LEGAL_READY early by mistake. */
export const LEGAL_HAS_PLACEHOLDERS = Object.values(LEGAL_DETAILS).some((v) =>
  v.includes("TO CONFIRM")
);
