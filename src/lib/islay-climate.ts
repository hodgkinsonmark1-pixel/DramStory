// ─────────────────────────────────────────────────────────────────────────
// Real monthly climate data for Islay, used by the weather/daylight
// banner. Sources:
// - Daylight hours: computed astronomically for Islay's actual latitude
//   (55.75°N) using the standard solar declination/hour-angle formula -
//   more precise than most web summaries, which tend to round crudely.
// - Average high temperature: UK Met Office's own official long-term
//   averages for Islay: Port Ellen, 1991-2020 period
//   (metoffice.gov.uk/research/climate/maps-and-data/uk-climate-averages).
// - General rainfall/wind character: corroborated across islayinfo.com's
//   own weather page, Weather Atlas, and Met Office - Islay has "rain in
//   all months" per every source, wettest Oct-Dec (~140-150mm), driest
//   Apr-Jun (~55-100mm), frequent Atlantic wind year-round.
// ─────────────────────────────────────────────────────────────────────────

export interface MonthClimate {
  daylightHours: string;
  avgHighC: number;
  summary: string;
}

export const ISLAY_CLIMATE: Record<number, MonthClimate> = {
  1: { daylightHours: "7h 20m", avgHighC: 7.9, summary: "short days, frequent rain and strong winds - pack warm waterproof layers" },
  2: { daylightHours: "9h 20m", avgHighC: 8.0, summary: "the coldest month on average, still wet and windy - pack warm waterproof layers" },
  3: { daylightHours: "11h 30m", avgHighC: 9.3, summary: "cool and changeable - a waterproof layer is essential" },
  4: { daylightHours: "13h 50m", avgHighC: 11.4, summary: "drier and sunnier than winter, but still changeable - pack layers" },
  5: { daylightHours: "16h 0m", avgHighC: 14.1, summary: "typically the driest, sunniest month - still worth packing a light waterproof" },
  6: { daylightHours: "17h 15m", avgHighC: 16.0, summary: "the longest days of the year and usually dry - pack light layers" },
  7: { daylightHours: "16h 45m", avgHighC: 17.3, summary: "one of the warmest months, but rain is still common - pack layers you can add and remove" },
  8: { daylightHours: "14h 50m", avgHighC: 17.3, summary: "the warmest month on average, rain still likely some days - pack layers" },
  9: { daylightHours: "12h 25m", avgHighC: 15.8, summary: "cooling down with noticeably less sunshine than summer - expect rain most days, pack layers" },
  10: { daylightHours: "10h 5m", avgHighC: 13.0, summary: "one of the wettest months - frequent rain and strong winds, pack proper waterproofs" },
  11: { daylightHours: "7h 55m", avgHighC: 10.3, summary: "wet, windy and short days - pack warm waterproof layers" },
  12: { daylightHours: "6h 45m", avgHighC: 8.5, summary: "the wettest and shortest-daylight month of the year - pack warm waterproof layers" },
};

export function getMonthClimate(monthNumber: number): MonthClimate {
  return ISLAY_CLIMATE[monthNumber] ?? ISLAY_CLIMATE[1];
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
