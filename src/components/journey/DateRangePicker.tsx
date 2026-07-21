"use client";

import { useEffect, useRef, useState } from "react";

interface DateRangePickerProps {
  startDate: string; // ISO "YYYY-MM-DD", may be ""
  endDate: string; // ISO "YYYY-MM-DD", may be ""
  onChange: (start: string, end: string) => void;
}

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

function formatDisplay(iso: string): string {
  const p = parseIso(iso);
  if (!p) return "";
  return `${String(p.d).padStart(2, "0")}/${String(p.m + 1).padStart(2, "0")}/${p.y}`;
}

/**
 * Replaces the old two-separate-native-date-inputs UX with a single
 * calendar the visitor clicks twice on: first click sets the start date,
 * second click sets the end date (and closes), rather than two distinct
 * date fields/pickers. Per 19 July 2026 feedback.
 */
export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const initial = parseIso(startDate) ?? { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };
  const [viewYear, setViewYear] = useState(initial.y);
  const [viewMonth, setViewMonth] = useState(initial.m);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPendingStart(null);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function openPicker() {
    setPendingStart(null);
    const p = parseIso(startDate);
    if (p) {
      setViewYear(p.y);
      setViewMonth(p.m);
    }
    setOpen(true);
  }

  function handleDayClick(iso: string) {
    if (!pendingStart) {
      setPendingStart(iso);
      return;
    }
    const a = pendingStart;
    const b = iso;
    const [rangeStart, rangeEnd] = a <= b ? [a, b] : [b, a];
    onChange(rangeStart, rangeEnd);
    setPendingStart(null);
    setOpen(false);
  }

  function goMonth(delta: number) {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // JS getDay(): 0=Sun..6=Sat. Convert to Monday-first index (0=Mon..6=Sun).
  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const effectiveEnd = pendingStart ? hoverDate ?? pendingStart : endDate;
  const effectiveStart = pendingStart ?? startDate;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="event-date-input"
        onClick={() => (open ? setOpen(false) : openPicker())}
        style={{ cursor: "pointer", textAlign: "left" }}
      >
        {startDate ? formatDisplay(startDate) : "Start date"}
        <span className="event-date-sep" style={{ margin: "0 6px" }}>
          to
        </span>
        {endDate ? formatDisplay(endDate) : "End date"}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 50,
            background: "white",
            border: "1px solid var(--stone)",
            borderRadius: "var(--radius)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: 16,
            width: 280,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--slate)", marginBottom: 10 }}>
            {pendingStart ? "Now pick your end date" : "Pick your start date"}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => goMonth(-1)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--copper)" }}
              aria-label="Previous month"
            >
              &larr;
            </button>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dark)" }}>
              {new Date(viewYear, viewMonth, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </div>
            <button
              type="button"
              onClick={() => goMonth(1)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--copper)" }}
              aria-label="Next month"
            >
              &rarr;
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} style={{ fontSize: 10, color: "var(--slate)", textAlign: "center", fontWeight: 600 }}>
                {w}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`pad-${i}`} />;
              const iso = toIso(viewYear, viewMonth, day);
              const isStart = iso === effectiveStart;
              const isEnd = iso === effectiveEnd;
              const inRange = effectiveStart && effectiveEnd && iso > effectiveStart && iso < effectiveEnd;
              const isPast = iso < today.toISOString().slice(0, 10);

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleDayClick(iso)}
                  onMouseEnter={() => pendingStart && setHoverDate(iso)}
                  style={{
                    padding: "6px 0",
                    fontSize: 12,
                    border: "none",
                    borderRadius: isStart || isEnd ? "var(--radius-sm)" : 0,
                    cursor: isPast ? "default" : "pointer",
                    color: isPast ? "var(--stone)" : isStart || isEnd ? "white" : "var(--dark)",
                    background: isStart || isEnd ? "var(--green-deep)" : inRange ? "var(--amber-pale)" : "transparent",
                    fontWeight: isStart || isEnd ? 600 : 400,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
