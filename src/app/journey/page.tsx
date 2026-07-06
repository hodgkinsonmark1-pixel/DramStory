import { getDistilleries } from "@/lib/data";
import type { TripTiming } from "@/lib/types";
import JourneyFlow from "@/components/journey/JourneyFlow";

function parseTiming(mode: string | string[] | undefined): TripTiming {
  const value = Array.isArray(mode) ? mode[0] : mode;
  if (value === "today" || value === "planning" || value === "inspiration") return value;
  return "inspiration";
}

export default async function JourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; resume?: string }>;
}) {
  const [{ mode, resume }, distilleries] = await Promise.all([searchParams, getDistilleries()]);

  return <JourneyFlow timing={parseTiming(mode)} distilleries={distilleries} resume={resume === "1"} />;
}
