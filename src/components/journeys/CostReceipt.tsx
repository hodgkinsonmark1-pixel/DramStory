import type { ClassicJourney } from "@/lib/journeys-data";
import { cheapestTourPrice, formatPrice } from "@/lib/journeys-data";
import { roundPriceUp } from "@/lib/pricing";
import type { Distillery } from "@/lib/types";

/** A literal "receipt" of what this route actually costs, stop by stop -
 *  torn paper edges and a dotted price leader are the one deliberate
 *  visual flourish here; everything else stays quiet so the real content
 *  (which stops are priced, which aren't) reads clearly at a glance. */
export default function CostReceipt({
  journey,
  distilleries,
}: {
  journey: ClassicJourney;
  distilleries: Distillery[];
}) {
  const stops = journey.distillerySlugs
    .map((slug) => distilleries.find((d) => d.slug === slug))
    .filter((d): d is Distillery => !!d);

  if (stops.length === 0) return null;

  const priced = stops
    .map((d) => ({ name: d.name, price: cheapestTourPrice(d) }))
    .filter((s): s is { name: string; price: number } => s.price !== null);
  const unpriced = stops.filter((d) => cheapestTourPrice(d) === null);

  const admissionsTotal = roundPriceUp(priced.reduce((sum, s) => sum + s.price, 0));

  return (
    <div style={{ margin: "8px 0 32px", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 380,
          background: "var(--amber-pale)",
          border: "1px solid var(--stone)",
          padding: "28px 26px 22px",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Torn perforated edges, top and bottom */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -1,
            left: 0,
            right: 0,
            height: 10,
            background:
              "linear-gradient(135deg, var(--amber-pale) 50%, transparent 50%), linear-gradient(45deg, var(--amber-pale) 50%, transparent 50%)",
            backgroundSize: "14px 14px",
            backgroundPosition: "top",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -1,
            left: 0,
            right: 0,
            height: 10,
            background:
              "linear-gradient(135deg, transparent 50%, var(--amber-pale) 50%), linear-gradient(45deg, transparent 50%, var(--amber-pale) 50%)",
            backgroundSize: "14px 14px",
            backgroundPosition: "bottom",
          }}
        />

        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--copper)",
            }}
          >
            2026 Price Guide
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 500,
              color: "var(--dark)",
              marginTop: 4,
            }}
          >
            {journey.name}
          </div>
        </div>

        <div style={{ borderTop: "1px dashed var(--mist)", margin: "16px 0 12px" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {priced.map((s) => (
            <ReceiptRow key={s.name} label={s.name} value={`from ${formatPrice(s.price)}`} />
          ))}
          {unpriced.map((d) => (
            <ReceiptRow key={d.slug} label={d.name} value="TBC" muted />
          ))}
          <ReceiptRow label="E-bike hire (Islay E-Wheels)" value="TBC" muted />
        </div>

        <div style={{ borderTop: "2px double var(--peat)", margin: "14px 0 10px" }} />

        <ReceiptRow
          label="Distillery admissions"
          value={`from ${formatPrice(admissionsTotal)}`}
          bold
        />

        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 11,
            color: "var(--slate)",
            textAlign: "center",
            marginTop: 16,
            lineHeight: 1.5,
          }}
        >
          Excl. food, accommodation &amp; travel between stops.
          {unpriced.length > 0 && (
            <>
              <br />
              {priced.length} of {stops.length} distilleries priced &middot; {unpriced.length} TBC
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: bold ? "var(--dark)" : muted ? "var(--slate)" : "var(--peat)",
          fontWeight: bold ? 600 : 400,
          fontStyle: muted ? "italic" : "normal",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        aria-hidden
        style={{
          flex: 1,
          borderBottom: "1px dotted var(--mist)",
          marginBottom: 3,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontVariantNumeric: "tabular-nums",
          fontSize: 13,
          fontWeight: bold ? 600 : 400,
          color: bold ? "var(--dark)" : muted ? "var(--slate)" : "var(--peat)",
          fontStyle: muted ? "italic" : "normal",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}
