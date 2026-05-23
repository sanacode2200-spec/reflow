"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { Schedule, ScheduleInstance } from "@/lib/types";
import { hasConflictOnDate } from "@/lib/recurrence";

const DAY_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

// getDay: 0=Sun → Monday-first offset: Mon=0, Sun=6
function mondayFirstOffset(date: Date): number {
  return (date.getDay() + 6) % 7;
}

type Props = {
  instance: ScheduleInstance;
  schedules: Schedule[];
  onCancel: () => void;
  onConfirm: (dates: Date[]) => void;
};

export default function CopyDatePicker({ instance, schedules, onCancel, onConfirm }: Props) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(instance.start_at));
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) }),
    [viewMonth]
  );
  const leadingBlanks = mondayFirstOffset(startOfMonth(viewMonth));

  const conflictKeys = useMemo(() => {
    const srcH = instance.start_at.getHours();
    const srcM = instance.start_at.getMinutes();
    const durationMs = instance.end_at.getTime() - instance.start_at.getTime();
    const keys = new Set<string>();
    for (const day of days) {
      const copyStart = new Date(day);
      copyStart.setHours(srcH, srcM, 0, 0);
      const copyEnd = new Date(copyStart.getTime() + durationMs);
      if (
        hasConflictOnDate(
          schedules,
          instance.therapist_id,
          instance.schedule_id,
          copyStart,
          copyEnd
        )
      ) {
        keys.add(format(day, "yyyy-MM-dd"));
      }
    }
    return keys;
  }, [schedules, days, instance]);

  const toggle = (day: Date) => {
    if (isSameDay(day, instance.start_at)) return;
    const key = format(day, "yyyy-MM-dd");
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirm = () => {
    const dates = Array.from(selectedKeys).map((s) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y!, m! - 1, d!);
    });
    onConfirm(dates);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onCancel}
    >
      <div
        className="w-76 rounded-xl bg-white p-5 shadow-2xl select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-sm font-semibold text-gray-800">複数の日付にコピー</h2>

        {/* 月ナビゲーション */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            className="flex h-7 w-7 items-center justify-center rounded text-lg leading-none text-gray-500 hover:bg-gray-100"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-gray-700">
            {format(viewMonth, "yyyy年M月")}
          </span>
          <button
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="flex h-7 w-7 items-center justify-center rounded text-lg leading-none text-gray-500 hover:bg-gray-100"
          >
            ›
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="mb-1 grid grid-cols-7">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="py-1 text-center text-[10px] text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* 日付セル */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const isOrigin = isSameDay(day, instance.start_at);
            const isSelected = selectedKeys.has(key);
            const isConflict = !isOrigin && conflictKeys.has(key);

            let cellCls: string;
            if (isOrigin) {
              cellCls = "bg-gray-100 text-gray-300 cursor-default";
            } else if (isSelected && isConflict) {
              cellCls = "bg-amber-500 text-white font-semibold";
            } else if (isSelected) {
              cellCls = "bg-sky-500 text-white font-semibold";
            } else if (isConflict) {
              cellCls = "border border-amber-400 text-amber-600 hover:bg-amber-50";
            } else {
              cellCls = "hover:bg-gray-100 text-gray-700";
            }

            return (
              <button
                key={key}
                onClick={() => toggle(day)}
                disabled={isOrigin}
                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors ${cellCls}`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        {/* 凡例 */}
        {conflictKeys.size > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-600">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-amber-400" />
            既存の予約と重複する日付
          </div>
        )}

        {/* フッター */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {(() => {
              if (selectedKeys.size === 0) return "日付を選択してください";
              const conflictCount = Array.from(selectedKeys).filter((k) =>
                conflictKeys.has(k)
              ).length;
              return conflictCount > 0
                ? `${selectedKeys.size}日選択中（うち${conflictCount}件は重複）`
                : `${selectedKeys.size}日選択中`;
            })()}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedKeys.size === 0}
              className="rounded bg-sky-500 px-4 py-1.5 text-sm text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              コピー
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
