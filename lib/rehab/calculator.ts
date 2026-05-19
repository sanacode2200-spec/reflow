const MINUTES_PER_UNIT = 20;
const MAX_UNITS = 9;

export function calcUnitsFromMinutes(diffMin: number): number {
  return Math.max(1, Math.min(MAX_UNITS, Math.round(diffMin / MINUTES_PER_UNIT)));
}
