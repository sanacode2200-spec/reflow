"use client";

import { useCallback, useMemo } from "react";
import RehabCalendar from "./RehabCalendar";
import {
  deleteSchedule,
  moveSchedule,
  createSchedule,
  cancelSchedule,
} from "@/lib/actions/schedule";
import type { ScheduleWithRelations } from "@/lib/actions/schedule";
import { calcUnitsFromMinutes } from "@/lib/rehab/calculator";
import type { Schedule, Staff, Patient } from "@/lib/types";

type PatientRow = { id: string; name_kanji: string };

type Props = {
  schedules: ScheduleWithRelations[];
  staffs: Staff[];
  patients: PatientRow[];
  currentStaffId: string;
  tenantId: string;
  onRefresh: () => void;
  onCreateOpen: (params: { start: Date; end: Date; therapistId: string }) => void;
  onEditOpen: (schedule: ScheduleWithRelations) => void;
};

export default function CalendarView({
  schedules,
  staffs,
  patients,
  currentStaffId,
  tenantId,
  onRefresh,
  onCreateOpen,
  onEditOpen,
}: Props) {
  const rehabSchedules = useMemo<Schedule[]>(
    () =>
      schedules.map((s) => ({
        id: s.id,
        patient_id: s.patient_id,
        therapist_id: s.therapist_id,
        start_at: s.start_at.toISOString(),
        end_at: s.end_at.toISOString(),
        recurrence_rule: s.recurrence_rule,
        units: s.units,
        session_status: s.session_status,
        comment: s.comment,
        is_cancelled: s.is_cancelled,
      })),
    [schedules]
  );

  const rehabPatients = useMemo<Patient[]>(
    () => patients.map((p) => ({ id: p.id, name: p.name_kanji })),
    [patients]
  );

  const handleScheduleUpdate = useCallback(
    async (schedule: Schedule) => {
      const startAt = new Date(schedule.start_at);
      const endAt = new Date(schedule.end_at);
      const diffMin = (endAt.getTime() - startAt.getTime()) / 60000;
      const units = calcUnitsFromMinutes(diffMin);
      await moveSchedule(schedule.id, tenantId, schedule.therapist_id, startAt, endAt, units);
      onRefresh();
    },
    [tenantId, onRefresh]
  );

  const handleScheduleCreate = useCallback(
    async (newSchedules: Schedule[]) => {
      for (const s of newSchedules) {
        const startAt = new Date(s.start_at);
        const endAt = new Date(s.end_at);
        const diffMin = (endAt.getTime() - startAt.getTime()) / 60000;
        const units = calcUnitsFromMinutes(diffMin);
        try {
          await createSchedule(tenantId, {
            patient_id: s.patient_id,
            therapist_id: s.therapist_id,
            start_at: s.start_at,
            end_at: s.end_at,
            units,
          });
        } catch (err) {
          console.error("スケジュール作成エラー:", err);
        }
      }
      onRefresh();
    },
    [tenantId, onRefresh]
  );

  const handleScheduleDelete = useCallback(
    async (scheduleId: string) => {
      try {
        await deleteSchedule(scheduleId, tenantId);
        onRefresh();
      } catch (err) {
        console.error("スケジュール削除エラー:", err);
      }
    },
    [tenantId, onRefresh]
  );

  const handleScheduleCancel = useCallback(
    async (scheduleId: string, cancel: boolean) => {
      await cancelSchedule(scheduleId, tenantId, cancel);
      onRefresh();
    },
    [tenantId, onRefresh]
  );

  const handleEditRequested = useCallback(
    (scheduleId: string) => {
      const found = schedules.find((s) => s.id === scheduleId);
      if (found) onEditOpen(found);
    },
    [schedules, onEditOpen]
  );

  return (
    <RehabCalendar
      staffs={staffs}
      patients={rehabPatients}
      schedules={rehabSchedules}
      currentStaffId={currentStaffId}
      onScheduleUpdate={handleScheduleUpdate}
      onScheduleCreate={handleScheduleCreate}
      onScheduleDelete={handleScheduleDelete}
      onScheduleCancel={handleScheduleCancel}
      onCreateRequested={onCreateOpen}
      onEditRequested={handleEditRequested}
    />
  );
}
