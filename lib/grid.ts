export const GRID_START_HOUR = 8;
export const GRID_END_HOUR = 18;
export const SLOT_MINUTES = 20;
export const SLOT_HEIGHT_PX = 40;

export const TOTAL_SLOTS = ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES;
export const TOTAL_HEIGHT_PX = TOTAL_SLOTS * SLOT_HEIGHT_PX; // 1200px

export function timeToTopPx(date: Date): number {
  const minutesFromStart = (date.getHours() - GRID_START_HOUR) * 60 + date.getMinutes();
  return (minutesFromStart / SLOT_MINUTES) * SLOT_HEIGHT_PX;
}

export function durationToPx(start: Date, end: Date): number {
  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
  return (durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT_PX;
}

export function getHourLabels(): { label: string; topPx: number }[] {
  const labels: { label: string; topPx: number }[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    const minutesFromStart = (h - GRID_START_HOUR) * 60;
    labels.push({
      label: `${String(h).padStart(2, "0")}:00`,
      topPx: (minutesFromStart / SLOT_MINUTES) * SLOT_HEIGHT_PX,
    });
  }
  return labels;
}

export function getSlotTopPxList(): number[] {
  return Array.from({ length: TOTAL_SLOTS }, (_, i) => i * SLOT_HEIGHT_PX);
}

export function snapMinutesToSlot(minutes: number): number {
  return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}
