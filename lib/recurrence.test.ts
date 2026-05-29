import { describe, expect, it } from "vitest";
import { hasConflictOnDate } from "./recurrence";
import type { Schedule } from "./types";

const baseSchedule: Schedule = {
  id: "schedule-1",
  patient_id: "patient-1",
  therapist_id: "staff-1",
  start_at: "2026-05-18T09:00:00",
  end_at: "2026-05-18T10:00:00",
  recurrence_rule: null,
  units: 2,
  session_status: "scheduled",
  comment: null,
  is_cancelled: false,
};

function schedule(overrides: Partial<Schedule>): Schedule {
  return { ...baseSchedule, ...overrides };
}

describe("hasConflictOnDate", () => {
  it("detects conflicts for a non-recurring schedule on the same date", () => {
    const schedules = [
      schedule({
        id: "existing",
        start_at: "2026-05-20T09:30:00",
        end_at: "2026-05-20T10:30:00",
      }),
    ];

    expect(
      hasConflictOnDate(
        schedules,
        "staff-1",
        "moving",
        new Date("2026-05-20T10:00:00"),
        new Date("2026-05-20T11:00:00")
      )
    ).toBe(true);
  });

  it("treats CUSTOM recurrence rules as single schedules", () => {
    const schedules = [
      schedule({
        id: "custom",
        start_at: "2026-05-18T09:00:00",
        end_at: "2026-05-18T10:00:00",
        recurrence_rule: "CUSTOM",
      }),
    ];

    expect(
      hasConflictOnDate(
        schedules,
        "staff-1",
        "moving",
        new Date("2026-05-25T09:30:00"),
        new Date("2026-05-25T10:30:00")
      )
    ).toBe(false);
  });

  it("detects conflicts for weekly recurrence rules on matching weekdays", () => {
    const schedules = [
      schedule({
        id: "weekly",
        recurrence_rule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      }),
    ];

    expect(
      hasConflictOnDate(
        schedules,
        "staff-1",
        "moving",
        new Date("2026-05-20T09:30:00"),
        new Date("2026-05-20T10:30:00")
      )
    ).toBe(true);
  });

  it("ignores the excluded schedule id", () => {
    const schedules = [
      schedule({
        id: "moving",
        start_at: "2026-05-20T09:30:00",
        end_at: "2026-05-20T10:30:00",
      }),
    ];

    expect(
      hasConflictOnDate(
        schedules,
        "staff-1",
        "moving",
        new Date("2026-05-20T09:30:00"),
        new Date("2026-05-20T10:30:00")
      )
    ).toBe(false);
  });
});
