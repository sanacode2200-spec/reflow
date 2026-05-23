"use client";

import { format, getDay } from "date-fns";
import type { Patient, ScheduleInstance, Staff } from "@/lib/types";

const JP_DAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

const OCCUPATION_LABEL: Record<string, string> = { pt: "PT", ot: "OT", st: "ST" };
const OCCUPATION_COLOR: Record<string, string> = {
  pt: "bg-sky-100 text-sky-700",
  ot: "bg-emerald-100 text-emerald-700",
  st: "bg-violet-100 text-violet-700",
};

type Props = {
  instance: ScheduleInstance;
  patient: Patient | undefined;
  staff: Staff | undefined;
  onClose: () => void;
  onCopyRequest: () => void;
};

export default function DetailPanel({ instance, patient, staff, onClose, onCopyRequest }: Props) {
  return (
    <div className="flex w-72 shrink-0 flex-col border-l bg-white shadow-md">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">予約詳細</span>
        <button
          onClick={onClose}
          className="text-lg leading-none text-gray-400 hover:text-gray-700"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <section>
          <p className="mb-0.5 text-xs text-gray-500">患者</p>
          <p className="font-medium text-gray-900">{patient?.name ?? "—"}</p>
        </section>

        <section>
          <p className="mb-0.5 text-xs text-gray-500">担当療法士</p>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{staff?.name ?? "—"}</span>
            {staff && (
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-bold ${OCCUPATION_COLOR[staff.occupation] ?? ""}`}
              >
                {OCCUPATION_LABEL[staff.occupation] ?? ""}
              </span>
            )}
          </div>
        </section>

        <section>
          <p className="mb-0.5 text-xs text-gray-500">日時</p>
          <p className="font-medium text-gray-900">
            {format(instance.start_at, "yyyy年M月d日")}（{JP_DAYS[getDay(instance.start_at)]}）
          </p>
          <p className="text-gray-700">
            {format(instance.start_at, "HH:mm")} 〜 {format(instance.end_at, "HH:mm")}
          </p>
        </section>

        <section>
          <p className="mb-0.5 text-xs text-gray-500">繰り返し</p>
          {instance.is_recurring ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-gray-700">繰り返し予約</span>
            </div>
          ) : (
            <span className="text-gray-500">単発</span>
          )}
        </section>

        <section>
          <p className="mb-0.5 text-xs text-gray-500">所要時間</p>
          <p className="text-gray-700">
            {Math.round((instance.end_at.getTime() - instance.start_at.getTime()) / 60000)} 分
          </p>
        </section>
      </div>

      <div className="shrink-0 border-t p-4">
        <button
          onClick={onCopyRequest}
          className="w-full rounded border border-sky-400 py-2 text-sm text-sky-600 transition-colors hover:bg-sky-50"
        >
          複数の日付にコピー
        </button>
      </div>
    </div>
  );
}
