import Image from "next/image";

type LogoProps = {
  size?: number;
  /** Show the "DramStory / Where whisky adventures begin" wordmark next to the mark */
  withWordmark?: boolean;
  /** Use light (white) text for the wordmark, for use on dark/photo backgrounds */
  light?: boolean;
};

/**
 * The DramStory primary mark (book + compass rose), extracted from the
 * approved brand sheet as a real asset at /public/logo.png rather than an
 * inline base64 string.
 */
export default function Logo({ size = 36, withWordmark = false, light = false }: LogoProps) {
  const mark = (
    <Image
      src="/logo.png"
      width={size}
      height={Math.round(size * (200 / 268))}
      alt="DramStory"
      priority
      style={{ objectFit: "contain", display: "block" }}
    />
  );

  if (!withWordmark) return mark;

  return (
    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {mark}
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          fontWeight: 500,
          color: light ? "white" : "var(--dark)",
          lineHeight: 1.1,
        }}
      >
        DramStory
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-body)",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: light ? "rgba(255,255,255,0.75)" : "var(--copper)",
          }}
        >
          Where whisky adventures begin
        </span>
      </span>
    </span>
  );
}
