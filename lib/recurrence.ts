import { addDays, isSameDay } from "date-fns";
import type { Schedule, ScheduleInstance } from "./types";

const BYDAY_TO_DOW: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function parseRRuleByday(rrule: string): number[] {
  const match = rrule.match(/BYDAY=([^;]+)/);
  if (!match || !match[1]) return [];
  return match[1]
    .split(",")
    .map((d) => BYDAY_TO_DOW[d] ?? -1)
    .filter((d) => d >= 0);
}

function parseISO8601(str: string): Date {
  // Handles both "2026-05-18T09:00:00" and "2026-05-18T09:00:00Z"
  return new Date(str);
}

export function expandSchedules(
  schedules: Schedule[],
  weekStart: Date,
  weekEnd: Date
): ScheduleInstance[] {
  const instances: ScheduleInstance[] = [];

  for (const schedule of schedules) {
    const baseStart = parseISO8601(schedule.start_at);
    const baseEnd = parseISO8601(schedule.end_at);
    const durationMs = baseEnd.getTime() - baseStart.getTime();

    if (!schedule.recurrence_rule || schedule.recurrence_rule === "CUSTOM") {
      if (baseStart >= weekStart && baseStart <= weekEnd) {
        instances.push({
          id: schedule.id,
          schedule_id: schedule.id,
          patient_id: schedule.patient_id,
          therapist_id: schedule.therapist_id,
          start_at: baseStart,
          end_at: baseEnd,
          is_recurring: false,
          units: schedule.units,
          session_status: schedule.session_status,
          comment: schedule.comment,
          is_cancelled: schedule.is_cancelled,
        });
      }
      continue;
    }

    const allowedDows = parseRRuleByday(schedule.recurrence_rule);

    for (let d = 0; d <= 6; d++) {
      const day = addDays(weekStart, d);
      const dow = day.getDay();
      if (allowedDows.length > 0 && !allowedDows.includes(dow)) continue;

      const start = new Date(day);
      start.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
      const end = new Date(start.getTime() + durationMs);

      const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      instances.push({
        id: `${schedule.id}__${dateStr}`,
        schedule_id: schedule.id,
        patient_id: schedule.patient_id,
        therapist_id: schedule.therapist_id,
        start_at: start,
        end_at: end,
        is_recurring: true,
        units: schedule.units,
        session_status: schedule.session_status,
        comment: schedule.comment,
        is_cancelled: schedule.is_cancelled,
      });
    }
  }

  return instances;
}

export function isSameDayInstance(instance: ScheduleInstance, date: Date): boolean {
  return isSameDay(instance.start_at, date);
}

// copyStart/copyEnd は既にターゲット日付の時刻まで含んだ Date
export function hasConflictOnDate(
  schedules: Schedule[],
  therapistId: string,
  excludeScheduleId: string,
  copyStart: Date,
  copyEnd: Date
): boolean {
  for (const schedule of schedules) {
    if (schedule.therapist_id !== therapistId) continue;
    if (schedule.id === excludeScheduleId) continue;

    const baseStart = new Date(schedule.start_at);
    const baseEnd = new Date(schedule.end_at);

    if (!schedule.recurrence_rule) {
      if (!isSameDay(baseStart, copyStart)) continue;
      if (baseStart < copyEnd && baseEnd > copyStart) return true;
    } else {
      const allowedDows = parseRRuleByday(schedule.recurrence_rule);
      const dow = copyStart.getDay();
      if (allowedDows.length > 0 && !allowedDows.includes(dow)) continue;

      const recStart = new Date(copyStart);
      recStart.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
      const durationMs = baseEnd.getTime() - baseStart.getTime();
      const recEnd = new Date(recStart.getTime() + durationMs);
      if (recStart < copyEnd && recEnd > copyStart) return true;
    }
  }
  return false;
}
