// Updated 21 July 2026 - the old copy ("Answer three simple questions")
// went stale when Q2 (region) and Q3 (interests) were inactivated as part
// of the MVP scope decision: the intake is genuinely one question now, not
// three. New wording, agreed with Mark line by line: (1) matches the
// actual one-question flow, (2) "days" plural is deliberate - the visitor
// lands on one real template day, but also gets full access to the wider
// Pre-Designed Days Hub from that same moment, so plural sets the right
// expectation rather than overpromising a single hand-picked day, (3)
// echoes "keep what you love, swap out what you don't" from the Days
// Hub's own intro copy (src/app/days/page.tsx) rather than coining a new,
// vaguer phrase - same idea, "change" swapped in for "swap out" here to
// avoid repeating "swap" so close to "days"/"day" above it.
const STEPS = [
  { number: 1, label: "One quick question, that's it" },
  { number: 2, label: "Real Islay days, already planned for you" },
  { number: 3, label: "Keep what you love, change what you don't" },
];

export default function HowToBuildStory() {
  return (
    <section className="how-section">
      <div className="how-eyebrow">How it works</div>
      <h2 className="how-title">How to build your story</h2>
      <div className="how-steps">
        {STEPS.map((s) => (
          <div className="how-step" key={s.number}>
            <div className="how-step-number">{s.number}</div>
            <div className="how-step-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
