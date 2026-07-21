import Link from "next/link";
import Footer from "./Footer";
import PageHeader from "./PageHeader";

export default function ComingSoon({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note: string;
}) {
  return (
    <>
      <PageHeader />
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "80px 24px",
          background: "var(--off-white)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--green-deep)",
            marginBottom: 16,
          }}
        >
          {eyebrow}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 300,
            color: "var(--dark)",
            marginBottom: 16,
          }}
        >
          {title}
        </h1>
        <p style={{ maxWidth: 480, color: "var(--slate)", lineHeight: 1.7 }}>{note}</p>
        <Link
          href="/"
          style={{
            marginTop: 32,
            padding: "14px 32px",
            background: "var(--green-deep)",
            color: "white",
            borderRadius: 100,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Back to home
        </Link>
      </div>
      <Footer />
    </>
  );
}
