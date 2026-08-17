import { cheapestTourPrice, formatPrice, roundPriceUp } from "@/lib/pricing";
import type { Distillery, Journey } from "@/lib/types";

const RECEIPT_FONT =
  "'SFMono-Regular', ui-monospace, 'IBM Plex Mono', 'Courier New', monospace";

/** A literal printed till receipt - the kind that would actually get
 *  folded up and put in a pocket. Monospace throughout (not the site's
 *  display serif) is the one deliberate departure from the normal brand
 *  type system here, because that's what makes it read as a receipt
 *  rather than another styled card. Torn paper edges and dotted price
 *  leaders carry the rest of the metaphor; everything else stays plain. */
export default function CostReceipt({ journey }: { journey: Journey }) {
  // Retargeted 17 Aug 2026 onto the Airtable Journey shape, with the
  // deletion of journeys-data.ts's hardcoded ClassicJourney (and its
  // hand-kept `distillerySlugs` list). The stops are the Journey's own
  // resolved Days' stops, deduplicated and left in visiting order, so
  // this no longer needs a separate `distilleries` array to look slugs
  // up in - a Day Stop already carries the real Distillery record.
  //
  // This component is still off the site (see "Pull cost display off the
  // site pending decision on how best to show it") - it is kept building
  // against live data rather than a shape nothing produces any more.
  const seen = new Set<string>();
  const stops: Distillery[] = [];
  for (const day of journey.days) {
    for (const stop of day.stops) {
      if (seen.has(stop.distillery.slug)) continue;
      seen.add(stop.distillery.slug);
      stops.push(stop.distillery);
    }
  }

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
          maxWidth: 320,
          background: "var(--amber-pale)",
          border: "1px solid var(--stone)",
          padding: "26px 22px 20px",
          boxShadow: "var(--shadow-card)",
          fontFamily: RECEIPT_FONT,
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

        <div style={{ textAlign: "center", marginBottom: 2 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--copper)",
            }}
          >
            {journey.name}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "var(--dark)",
              marginTop: 5,
            }}
          >
            Our journey costs 2026
          </div>
        </div>

        <div style={{ borderTop: "1px dashed var(--mist)", margin: "14px 0 12px" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {priced.map((s) => (
            <ReceiptRow key={s.name} label={s.name} value={`from ${formatPrice(s.price)}`} />
          ))}
          {unpriced.map((d) => (
            <ReceiptRow key={d.slug} label={d.name} value="TBC" muted />
          ))}
          <ReceiptRow label="Swim (MacTaggart Leisure Centre)" value="TBC" muted />
          <ReceiptRow label="E-bike hire (Islay E-Wheels)" value="TBC" muted />
        </div>

        <div style={{ borderTop: "2px double var(--peat)", margin: "12px 0 10px" }} />

        <ReceiptRow
          label="Distillery admissions"
          value={`from ${formatPrice(admissionsTotal)}`}
          bold
        />

        <div
          style={{
            fontSize: 10,
            color: "var(--slate)",
            textAlign: "center",
            marginTop: 16,
            lineHeight: 1.6,
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
          fontSize: 12,
          color: bold ? "var(--dark)" : muted ? "var(--slate)" : "var(--peat)",
          fontWeight: bold ? 700 : 400,
          fontStyle: muted ? "italic" : "normal",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
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
          fontVariantNumeric: "tabular-nums",
          fontSize: 12,
          fontWeight: bold ? 700 : 400,
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

