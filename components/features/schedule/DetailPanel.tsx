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
    <div className="border-border bg-card text-card-foreground flex w-72 shrink-0 flex-col border-l shadow-md">
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">予約詳細</span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-lg leading-none"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <section>
          <p className="text-muted-foreground mb-0.5 text-xs">患者</p>
          <p className="text-foreground font-medium">{patient?.name ?? "—"}</p>
        </section>

        <section>
          <p className="text-muted-foreground mb-0.5 text-xs">担当療法士</p>
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">{staff?.name ?? "—"}</span>
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
          <p className="text-muted-foreground mb-0.5 text-xs">日時</p>
          <p className="text-foreground font-medium">
            {format(instance.start_at, "yyyy年M月d日")}（{JP_DAYS[getDay(instance.start_at)]}）
          </p>
          <p className="text-muted-foreground">
            {format(instance.start_at, "HH:mm")} 〜 {format(instance.end_at, "HH:mm")}
          </p>
        </section>

        <section>
          <p className="text-muted-foreground mb-0.5 text-xs">繰り返し</p>
          {instance.is_recurring ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-muted-foreground">繰り返し予約</span>
            </div>
          ) : (
            <span className="text-muted-foreground">単発</span>
          )}
        </section>

        <section>
          <p className="text-muted-foreground mb-0.5 text-xs">所要時間</p>
          <p className="text-muted-foreground">
            {Math.round((instance.end_at.getTime() - instance.start_at.getTime()) / 60000)} 分
          </p>
        </section>
      </div>

      <div className="border-border shrink-0 border-t p-4">
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
