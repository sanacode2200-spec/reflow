export const GRID_START_HOUR = 8;
export const GRID_END_HOUR = 18;

export function getTotalSlots(slotMinutes: number): number {
  return ((GRID_END_HOUR - GRID_START_HOUR) * 60) / slotMinutes;
}

export function getTotalHeightPx(slotMinutes: number, slotHeightPx: number): number {
  return getTotalSlots(slotMinutes) * slotHeightPx;
}

export function timeToTopPx(date: Date, slotMinutes: number, slotHeightPx: number): number {
  const minutesFromStart = (date.getHours() - GRID_START_HOUR) * 60 + date.getMinutes();
  return (minutesFromStart / slotMinutes) * slotHeightPx;
}

export function durationToPx(
  start: Date,
  end: Date,
  slotMinutes: number,
  slotHeightPx: number
): number {
  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
  return (durationMinutes / slotMinutes) * slotHeightPx;
}

export function getHourLabels(
  slotMinutes: number,
  slotHeightPx: number
): { label: string; topPx: number; hour: number }[] {
  const labels: { label: string; topPx: number; hour: number }[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    const minutesFromStart = (h - GRID_START_HOUR) * 60;
    labels.push({
      label: `${String(h).padStart(2, "0")}:00`,
      topPx: (minutesFromStart / slotMinutes) * slotHeightPx,
      hour: h,
    });
  }
  return labels;
}

export function snapMinutesToSlot(minutes: number, slotMinutes: number): number {
  return Math.round(minutes / slotMinutes) * slotMinutes;
}
