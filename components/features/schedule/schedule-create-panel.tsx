"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  format,
  startOfMonth,
  endOfMonth,
  getDay,
  addMonths,
  subMonths,
  addDays,
  isBefore,
  startOfDay,
} from "date-fns";
import { createSchedule, updateSchedule, getPatientsForSchedule } from "@/lib/actions/schedule";
import { calcUnitsFromMinutes } from "@/lib/rehab/calculator";
import type { ScheduleWithRelations } from "@/lib/actions/schedule";
import { cn } from "@/lib/utils";

type PatientOption = { id: string; name_kanji: string; name_kana: string };
type StaffOption = { id: string; name: string; occupation: string };

type Props = {
  tenantId: string;
  staffs: StaffOption[];
  defaultTherapistId: string | null;
  defaultStart: Date | null;
  defaultEnd: Date | null;
  defaultPatientId?: string;
  defaultPatientName?: string;
  editSchedule?: ScheduleWithRelations;
  onClose: () => void;
  onCreated: () => void;
};

// ミニカレンダー：ベース日付は常に選択済み（黒）、追加日はトグル（青）
function MultiDatePicker({
  baseDate,
  extraDates,
  onToggle,
}: {
  baseDate: Date;
  extraDates: Set<string>;
  onToggle: (dateStr: string) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(baseDate));
  const baseDateStr = format(baseDate, "yyyy-MM-dd");
  const today = startOfDay(new Date());

  const cells = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    // 月曜始まりのオフセット (月=0, 火=1 ... 日=6)
    const offset = (getDay(monthStart) + 6) % 7;
    const result: (Date | null)[] = Array(offset).fill(null);
    let d = monthStart;
    while (d <= monthEnd) {
      result.push(d);
      d = addDays(d, 1);
    }
    return result;
  }, [viewMonth]);

  return (
    <div className="rounded-xl border border-[rgba(20,24,60,0.06)] bg-white/70 p-3">
      {/* ヘッダー */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className="rounded-lg p-1 text-[#8a8fa3] transition-colors hover:bg-white hover:text-[#1d1f2b]"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-medium text-[#111]">{format(viewMonth, "yyyy年M月")}</span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="rounded-lg p-1 text-[#8a8fa3] transition-colors hover:bg-white hover:text-[#1d1f2b]"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {["月", "火", "水", "木", "金", "土", "日"].map((d) => (
          <div key={d} className="text-[10px] text-[#8a8fa3]">
            {d}
          </div>
        ))}
      </div>

      {/* 日付セル */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const str = format(day, "yyyy-MM-dd");
          const isBase = str === baseDateStr;
          const isExtra = extraDates.has(str);
          const isPast = isBefore(day, today) && !isBase;

          return (
            <button
              key={str}
              type="button"
              disabled={isPast}
              onClick={() => {
                if (!isBase) onToggle(str);
              }}
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded text-[11px] font-medium transition-colors",
                isBase
                  ? "bg-[#1d1f2b] text-white"
                  : isExtra
                    ? "bg-[#6366f1] text-white"
                    : isPast
                      ? "cursor-not-allowed text-[#c9cbd6]"
                      : "text-[#1d1f2b] hover:bg-white"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* 選択中の追加日リスト */}
      {extraDates.size > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {[...extraDates].sort().map((d) => (
            <span
              key={d}
              className="flex items-center gap-1 rounded-full bg-[#6366f1]/10 px-2 py-0.5 text-[10px] text-[#6366f1]"
            >
              {format(new Date(d + "T00:00:00"), "M/d")}
              <button
                type="button"
                onClick={() => onToggle(d)}
                className="leading-none text-[#6366f1] hover:text-[#4f52e0]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScheduleCreatePanel({
  tenantId,
  staffs,
  defaultTherapistId,
  defaultStart,
  defaultEnd,
  defaultPatientId,
  defaultPatientName,
  editSchedule,
  onClose,
  onCreated,
}: Props) {
  const isEdit = !!editSchedule;
  const isOpen = defaultStart !== null || isEdit;

  const [allPatients, setAllPatients] = useState<PatientOption[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [showList, setShowList] = useState(false);
  const [therapistId, setTherapistId] = useState(defaultTherapistId || staffs[0]?.id || "");
  const [startStr, setStartStr] = useState("");
  const [endStr, setEndStr] = useState("");
  const [units, setUnits] = useState(1);
  const [extraDates, setExtraDates] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      getPatientsForSchedule(tenantId).then(setAllPatients).catch(console.error);
    }
  }, [isOpen, tenantId]);

  // プロップが変わったらフォームをリセット（レンダー中の state 調整パターン）
  const resetKey = isEdit ? (editSchedule?.id ?? "") : (defaultStart?.toISOString() ?? "");
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    if (isEdit && editSchedule) {
      setStartStr(format(editSchedule.start_at, "yyyy-MM-dd'T'HH:mm"));
      setEndStr(format(editSchedule.end_at, "yyyy-MM-dd'T'HH:mm"));
      setUnits(editSchedule.units);
      setPatientId(editSchedule.patient_id);
      setPatientName(editSchedule.patient_name);
      setTherapistId(editSchedule.therapist_id);
      setComment(editSchedule.comment ?? "");
    } else if (defaultStart && defaultEnd) {
      setStartStr(format(defaultStart, "yyyy-MM-dd'T'HH:mm"));
      setEndStr(format(defaultEnd, "yyyy-MM-dd'T'HH:mm"));
      const diffMin = (defaultEnd.getTime() - defaultStart.getTime()) / 60000;
      setUnits(calcUnitsFromMinutes(diffMin));
      setPatientId(defaultPatientId ?? "");
      setPatientName(defaultPatientName ?? "");
      setTherapistId(defaultTherapistId || staffs[0]?.id || "");
      setComment("");
    }
    setPatientSearch("");
    setExtraDates(new Set());
    setError(null);
  }

  const calcUnits = (start: string, end: string) => {
    const diffMin = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    return diffMin > 0 ? calcUnitsFromMinutes(diffMin) : units;
  };

  const filtered = allPatients.filter(
    (p) => p.name_kanji.includes(patientSearch) || p.name_kana.includes(patientSearch)
  );

  const toggleExtraDate = (dateStr: string) => {
    setExtraDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        let result: { error: string } | void;
        if (isEdit && editSchedule) {
          result = await updateSchedule(editSchedule.id, tenantId, {
            startAt: new Date(startStr),
            endAt: new Date(endStr),
            units,
            therapistId: therapistId,
            patientId: patientId,
            comment: comment || null,
          });
        } else {
          result = await createSchedule(tenantId, {
            patient_id: patientId,
            therapist_id: therapistId,
            start_at: new Date(startStr).toISOString(),
            end_at: new Date(endStr).toISOString(),
            units,
            comment: comment || undefined,
            extra_dates: [...extraDates],
          });
        }
        if (result?.error) {
          setError(result.error);
          return;
        }
        onCreated();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存に失敗しました");
      }
    });
  };

  const totalCount = 1 + extraDates.size;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[rgba(20,24,60,0.06)] bg-[rgba(255,255,255,0.86)] shadow-[0_24px_60px_rgba(20,24,60,0.14)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-[rgba(20,24,60,0.06)] px-5 py-4">
              <div>
                <p className="text-[11px] font-medium text-[#8a8fa3]">
                  {isEdit ? "スケジュール変更" : "新規スケジュール"}
                </p>
                <h2 className="mt-0.5 text-base font-semibold text-[#1d1f2b]">
                  {isEdit ? "予約を編集" : "予約を作成"}
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="text-[#8a8fa3] hover:text-[#1d1f2b]"
              >
                <X size={18} />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-4 p-5">
                {/* 患者 */}
                <div className="space-y-1.5">
                  <Label>患者</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="氏名で検索"
                      value={patientId ? patientName : patientSearch}
                      onChange={(e) => {
                        if (patientId) {
                          setPatientId("");
                          setPatientName("");
                        }
                        setPatientSearch(e.target.value);
                        setShowList(true);
                      }}
                      onFocus={() => !patientId && setShowList(true)}
                      onBlur={() => setTimeout(() => setShowList(false), 150)}
                    />
                    {showList && !patientId && (
                      <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-[rgba(20,24,60,0.06)] bg-white shadow-[0_12px_28px_rgba(20,24,60,0.12)]">
                        {filtered.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-[#8a8fa3]">
                            {patientSearch ? "見つかりません" : "氏名を入力してください"}
                          </div>
                        ) : (
                          filtered.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[#f7f7fb]"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setPatientId(p.id);
                                setPatientName(p.name_kanji);
                                setPatientSearch("");
                                setShowList(false);
                              }}
                            >
                              <span className="font-medium text-[#1d1f2b]">{p.name_kanji}</span>
                              <span className="ml-2 text-xs text-[#8a8fa3]">{p.name_kana}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 実施療法士 */}
                <div className="space-y-1.5">
                  <Label>実施療法士</Label>
                  <select
                    value={therapistId}
                    onChange={(e) => setTherapistId(e.target.value)}
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:ring-3"
                    required
                  >
                    {staffs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}（{s.occupation.toUpperCase()}）
                      </option>
                    ))}
                  </select>
                </div>

                {/* 開始時刻 */}
                <div className="space-y-1.5">
                  <Label>開始時刻</Label>
                  <Input
                    type="datetime-local"
                    value={startStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStartStr(val);
                      if (endStr) setUnits(calcUnits(val, endStr));
                    }}
                    required
                  />
                </div>

                {/* 終了時刻 */}
                <div className="space-y-1.5">
                  <Label>終了時刻</Label>
                  <Input
                    type="datetime-local"
                    value={endStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEndStr(val);
                      if (startStr) setUnits(calcUnits(startStr, val));
                    }}
                    required
                  />
                </div>

                {/* 単位数 */}
                <div className="space-y-1.5">
                  <Label>単位数</Label>
                  <Input
                    type="number"
                    min={1}
                    max={9}
                    value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                    required
                  />
                  <p className="text-xs text-[#8a8fa3]">1単位=20分。患者1日上限6単位。</p>
                </div>

                {/* メモ・伝達事項 */}
                <div className="space-y-1.5">
                  <Label>メモ・伝達事項</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="療法士への申し送り、注意事項など"
                    rows={3}
                    maxLength={500}
                    className="resize-none"
                  />
                  {comment.length > 400 && (
                    <p className="text-right text-[10px] text-[#8a8fa3]">{comment.length}/500</p>
                  )}
                </div>

                {/* 複数日付選択（新規作成時のみ） */}
                {!isEdit && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <Label>他の日にもコピー</Label>
                      {extraDates.size > 0 && (
                        <span className="text-[10px] text-[#6366f1]">計 {totalCount} 件作成</span>
                      )}
                    </div>
                    {startStr ? (
                      <MultiDatePicker
                        baseDate={new Date(startStr)}
                        extraDates={extraDates}
                        onToggle={toggleExtraDate}
                      />
                    ) : (
                      <p className="text-xs text-[#8a8fa3]">開始時刻を入力すると選択できます</p>
                    )}
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t border-[rgba(20,24,60,0.06)] bg-white/40 px-5 py-4">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !patientId || !therapistId || !startStr || !endStr}
                  className="flex-1 bg-[#6366f1] shadow-[0_8px_18px_rgba(99,102,241,0.24)] hover:bg-[#4f52e0]"
                >
                  {isPending
                    ? "保存中..."
                    : isEdit
                      ? "変更を保存"
                      : totalCount > 1
                        ? `${totalCount} 件の予約を作成`
                        : "予約を作成"}
                </Button>
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
