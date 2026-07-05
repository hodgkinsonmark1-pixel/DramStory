const STEPS = [
  { number: 1, label: "Answer three simple questions" },
  { number: 2, label: "Explore an interactive map" },
  { number: 3, label: "Build your own whisky journey" },
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
