"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, AlertTriangle, Copy, Check } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { getSessionPanelData, upsertSession, type SessionPanelData } from "@/lib/actions/session";
import { ADDITION_OPTIONS } from "@/lib/constants/session";
import { calcUnitsFromMinutes } from "@/lib/rehab/calculator";
import type { ScheduleWithRelations } from "@/lib/actions/schedule";

type Props = {
  schedule: ScheduleWithRelations | null;
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "未記録",
  draft: "一時保存",
  completed: "実施済み",
};
const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-[#f5f5f5] text-[#888]",
  draft: "bg-orange-100 text-orange-700",
  completed: "bg-green-50 text-green-700",
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function buildCopyText(params: {
  patientName: string;
  therapistName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  units: number;
  isAmbulatory: boolean;
  soapS: string;
  soapO: string;
  soapA: string;
  soapP: string;
  additions: string[];
}): string {
  const {
    patientName,
    therapistName,
    sessionDate,
    startTime,
    endTime,
    units,
    isAmbulatory,
    soapS,
    soapO,
    soapA,
    soapP,
    additions,
  } = params;

  const additionLabels = additions
    .map((k) => ADDITION_OPTIONS.find((o) => o.key === k)?.label)
    .filter(Boolean)
    .join("・");

  const lines: string[] = [
    `【実施記録】`,
    `患者: ${patientName}`,
    `実施日: ${sessionDate}`,
    `担当療法士: ${therapistName}`,
    `実施時刻: ${startTime}〜${endTime}（${units}単位）`,
    `離床: ${isAmbulatory ? "あり" : "なし（減算）"}`,
    ...(additionLabels ? [`算定加算: ${additionLabels}`] : []),
    "",
  ];
  if (soapS.trim()) lines.push(`S（主観）:\n${soapS.trim()}`, "");
  if (soapO.trim()) lines.push(`O（客観）:\n${soapO.trim()}`, "");
  if (soapA.trim()) lines.push(`A（評価）:\n${soapA.trim()}`, "");
  if (soapP.trim()) lines.push(`P（計画）:\n${soapP.trim()}`, "");

  return lines.join("\n").trimEnd();
}

export default function SessionPanel({ schedule, tenantId, onClose, onSaved }: Props) {
  const isOpen = !!schedule;

  const [data, setData] = useState<SessionPanelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [units, setUnits] = useState(1);
  const [isAmbulatory, setIsAmbulatory] = useState(true);
  const [soapS, setSoapS] = useState("");
  const [soapO, setSoapO] = useState("");
  const [soapA, setSoapA] = useState("");
  const [soapP, setSoapP] = useState("");
  const [additions, setAdditions] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!schedule) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setFetchError(null);

    getSessionPanelData(schedule.id, tenantId)
      .then((d) => {
        setData(d);
        const src = d.session;
        setStartTime(src?.actualStartTime ?? format(new Date(d.scheduleStartAt), "HH:mm"));
        setEndTime(src?.actualEndTime ?? format(new Date(d.scheduleEndAt), "HH:mm"));
        setUnits(src?.units ?? d.scheduleUnits);
        setIsAmbulatory(src?.isAmbulatory ?? true);
        setSoapS(src?.soapSubjective ?? "");
        setSoapO(src?.soapObjective ?? "");
        setSoapA(src?.soapAssessment ?? "");
        setSoapP(src?.soapPlan ?? "");
        if (src) {
          setAdditions(src.additions);
        } else {
          const preset: string[] = [];
          if (d.additionAlert.initial) preset.push("initial");
          else if (d.additionAlert.early) preset.push("early_rehab");
          setAdditions(preset);
        }
        setSaveError(null);
      })
      .catch((err) => setFetchError(err instanceof Error ? err.message : "読み込みに失敗しました"))
      .finally(() => setLoading(false));
    // schedule.id が変わったときのみ再フェッチ。schedule オブジェクト参照は意図的に除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule?.id, tenantId]);

  const recalcUnits = (start: string, end: string) => {
    if (!start || !end) return;
    const diffMin = timeToMinutes(end) - timeToMinutes(start);
    if (diffMin > 0) setUnits(calcUnitsFromMinutes(diffMin));
  };

  const toggleAddition = (key: string) => {
    setAdditions((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const copyText = useMemo(() => {
    if (!data) return "";
    return buildCopyText({
      patientName: data.patientName,
      therapistName: data.therapistName,
      sessionDate: format(new Date(data.scheduleStartAt), "yyyy年M月d日"),
      startTime,
      endTime,
      units,
      isAmbulatory,
      soapS,
      soapO,
      soapA,
      soapP,
      additions,
    });
  }, [data, startTime, endTime, units, isAmbulatory, soapS, soapO, soapA, soapP, additions]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (status: "draft" | "completed") => {
    if (!schedule || !data) return;
    setSaveError(null);
    startTransition(async () => {
      try {
        await upsertSession({
          scheduleId: schedule.id,
          tenantId,
          sessionId: schedule.session_id,
          status,
          units,
          soapSubjective: soapS || null,
          soapObjective: soapO || null,
          soapAssessment: soapA || null,
          soapPlan: soapP || null,
          isAmbulatory,
          actualStartTime: startTime || null,
          actualEndTime: endTime || null,
          sessionDate: format(new Date(data.scheduleStartAt), "yyyy-MM-dd"),
          additions,
        });
        onSaved();
        onClose();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "保存に失敗しました");
      }
    });
  };

  const hasSoap = soapS.trim() || soapO.trim() || soapA.trim() || soapP.trim();
  const canComplete = units > 0 && !!hasSoap;
  const currentStatus = data?.session?.status ?? "scheduled";
  const { initial, early, initialDaysLeft, earlyDaysLeft } = data?.additionAlert ?? {
    initial: false,
    early: false,
    initialDaysLeft: 0,
    earlyDaysLeft: 0,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="session-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
          />
          <motion.aside
            key="session-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[740px] flex-col border-l border-[#eaeaea] bg-white shadow-xl"
          >
            {/* ヘッダー */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#eaeaea] px-5 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#111]">実施記録</h2>
                {!loading && data && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[currentStatus] ?? STATUS_STYLE.scheduled}`}
                  >
                    {STATUS_LABEL[currentStatus]}
                  </span>
                )}
                {!loading && data && (
                  <span className="text-sm text-[#888]">
                    {data.patientName}・{data.therapistName}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded p-1 text-[#888] transition-colors hover:text-[#111]"
              >
                <X size={18} />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-[#888]">読み込み中...</p>
              </div>
            ) : fetchError ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <p className="text-sm text-red-600">{fetchError}</p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1">
                {/* 左：コピー用テキスト */}
                <div className="flex w-60 shrink-0 flex-col border-r border-[#eaeaea] bg-[#fafafa]">
                  <div className="flex shrink-0 items-center justify-between border-b border-[#eaeaea] px-4 py-2.5">
                    <span className="text-xs font-medium text-[#888]">コピー用テキスト</span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 rounded-md border border-[#eaeaea] bg-white px-2 py-1 text-xs font-medium text-[#111] transition-colors hover:bg-[#f5f5f5]"
                    >
                      {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                      {copied ? "コピー済み" : "コピー"}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={copyText}
                    className="flex-1 resize-none bg-transparent p-4 font-mono text-[11px] leading-relaxed text-[#444] focus:outline-none"
                  />
                </div>

                {/* 右：入力フォーム */}
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    {/* 予約情報 */}
                    {data && (
                      <div className="rounded-lg border border-[#eaeaea] bg-[#fafafa] px-4 py-2.5 text-sm">
                        <span className="text-[#888]">予約：</span>
                        <span className="font-medium text-[#111]">
                          {format(new Date(data.scheduleStartAt), "M月d日 HH:mm")}〜
                          {format(new Date(data.scheduleEndAt), "HH:mm")}
                        </span>
                        <span className="ml-2 text-xs text-[#888]">{data.scheduleUnits}単位</span>
                      </div>
                    )}

                    {/* 加算アラート */}
                    {initial && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                        <p className="text-xs text-amber-700">
                          <span className="font-medium">初期加算対象</span>（残{initialDaysLeft}日）
                        </p>
                      </div>
                    )}
                    {early && !initial && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                        <p className="text-xs text-amber-700">
                          <span className="font-medium">早期加算対象</span>（残{earlyDaysLeft}日）
                        </p>
                      </div>
                    )}

                    {/* 実施時刻 */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#888]">
                        実施時刻
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => {
                            setStartTime(e.target.value);
                            recalcUnits(e.target.value, endTime);
                          }}
                          className="w-28 rounded-lg border border-[#eaeaea] px-2 py-1.5 text-sm focus:border-[#111] focus:outline-none"
                        />
                        <span className="text-[#888]">〜</span>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => {
                            setEndTime(e.target.value);
                            recalcUnits(startTime, e.target.value);
                          }}
                          className="w-28 rounded-lg border border-[#eaeaea] px-2 py-1.5 text-sm focus:border-[#111] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* 単位数 */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#888]">単位数</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={9}
                          value={units}
                          onChange={(e) => setUnits(Number(e.target.value))}
                          className="w-20 rounded-lg border border-[#eaeaea] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
                        />
                        <span className="text-sm text-[#888]">単位（1単位＝20分）</span>
                      </div>
                    </div>

                    {/* 離床 — スロット切り替えと同スタイル */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#888]">離床</label>
                      <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-sm">
                        {(["あり", "なし（減算）"] as const).map((label) => {
                          const value = label === "あり";
                          const active = isAmbulatory === value;
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setIsAmbulatory(value)}
                              className={`rounded-md px-3 py-1 transition-all ${
                                active
                                  ? "bg-white font-medium text-slate-800 shadow-sm"
                                  : "text-slate-500 hover:text-slate-700"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* SOAP記録 */}
                    <div>
                      <div className="mb-1.5 flex items-baseline gap-1">
                        <label className="text-xs font-medium text-[#888]">記録（SOAP）</label>
                        <span className="text-[10px] text-red-400">完了時いずれか必須</span>
                      </div>
                      <div className="space-y-2">
                        {(
                          [
                            { key: "S", label: "S：主観的情報", value: soapS, set: setSoapS },
                            { key: "O", label: "O：客観的情報", value: soapO, set: setSoapO },
                            { key: "A", label: "A：評価", value: soapA, set: setSoapA },
                            { key: "P", label: "P：計画", value: soapP, set: setSoapP },
                          ] as const
                        ).map(({ key, label, value, set }) => (
                          <div key={key}>
                            <p className="mb-0.5 text-[10px] font-medium text-[#888]">{label}</p>
                            <textarea
                              value={value}
                              onChange={(e) => set(e.target.value)}
                              rows={2}
                              maxLength={2000}
                              className="w-full resize-none rounded-lg border border-[#eaeaea] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 算定加算 */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#888]">
                        算定加算
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {ADDITION_OPTIONS.map(({ key, label }) => {
                          const active = additions.includes(key);
                          const isAlert =
                            (key === "initial" && initial) || (key === "early_rehab" && early);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleAddition(key)}
                              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                active
                                  ? "border-[#6366f1] bg-[#6366f1]/10 text-[#6366f1]"
                                  : "border-[#eaeaea] text-[#888] hover:border-[#ccc] hover:text-[#555]"
                              }`}
                            >
                              {isAlert && !active && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              )}
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {saveError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                        {saveError}
                      </div>
                    )}
                  </div>

                  {/* フッター */}
                  <div className="flex shrink-0 gap-2 border-t border-[#eaeaea] px-5 py-4">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSave("draft")}
                      className="flex-1 rounded-lg border border-[#eaeaea] px-4 py-2 text-sm font-medium text-[#111] transition-colors hover:bg-[#fafafa] disabled:opacity-50"
                    >
                      {isPending ? "保存中..." : "一時保存"}
                    </button>
                    <button
                      type="button"
                      disabled={isPending || !canComplete}
                      onClick={() => handleSave("completed")}
                      title={!canComplete ? "単位数とSOAPを入力してください" : undefined}
                      className="flex-1 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isPending ? "保存中..." : "実施完了"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
