"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Calendar,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  CheckCircle,
  ClipboardList,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { getSessionPanelData, upsertSession, type SessionPanelData } from "@/lib/actions/session";
import { ADDITION_OPTIONS } from "@/lib/constants/session";
import { calcUnitsFromMinutes } from "@/lib/rehab/calculator";

type Props = {
  scheduleId: string | null;
  sessionId: string | null;
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "未記録",
  draft: "一時保存",
  completed: "実施済み",
};

const STATUS_COLOR: Record<string, { bg: string; fg: string; dot: string }> = {
  scheduled: { bg: "var(--muted)", fg: "var(--muted-foreground)", dot: "var(--muted-foreground)" },
  draft: { bg: "rgba(245,158,11,0.14)", fg: "#b45309", dot: "#f59e0b" },
  completed: { bg: "rgba(34,197,94,0.12)", fg: "#15803d", dot: "#22c55e" },
};

const D = {
  ink: "var(--foreground)",
  ink2: "var(--muted-foreground)",
  ink3: "var(--muted-foreground)",
  accent: "var(--primary)",
  accentFg: "var(--primary-foreground)",
  accentSoft: "color-mix(in oklch, var(--primary) 12%, transparent)",
  warn: "#f59e0b",
  warnSoft: "rgba(245,158,11,0.14)",
  divider: "var(--border)",
  card: "var(--glass-card-background)",
  cardShadow: "var(--glass-card-shadow)",
  subtle: "var(--subtle-surface)",
  muted: "var(--muted)",
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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

function SoapBox({
  letter,
  title,
  value,
  placeholder,
  onChange,
}: {
  letter: string;
  title: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-2xl p-3"
      style={{ background: D.subtle, minHeight: 90 }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ background: D.accent, fontFamily: "var(--font-mono)" }}
        >
          {letter}
        </div>
        <span className="text-xs font-semibold" style={{ color: D.ink2 }}>
          {title}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        className="flex-1 resize-none bg-transparent text-sm leading-relaxed focus:outline-none"
        style={{ color: value ? D.ink : D.ink3 }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLOR[status] ?? STATUS_COLOR["scheduled"]!;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.dot }} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function SessionPanel({ scheduleId, sessionId, tenantId, onClose, onSaved }: Props) {
  const isOpen = !!scheduleId;

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
    if (!scheduleId) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const d = await getSessionPanelData(scheduleId, tenantId);
        if (cancelled) return;
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
      } catch (err) {
        if (!cancelled)
          setFetchError(err instanceof Error ? err.message : "読み込みに失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scheduleId, tenantId]);

  const recalcUnits = (start: string, end: string) => {
    if (!start || !end) return;
    const diffMin = timeToMinutes(end) - timeToMinutes(start);
    if (diffMin > 0) setUnits(calcUnitsFromMinutes(diffMin));
  };

  const recalcEndTime = (start: string, newUnits: number) => {
    if (!start) return;
    setEndTime(minutesToTime(timeToMinutes(start) + newUnits * 20));
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
    if (!scheduleId || !data) return;
    setSaveError(null);
    startTransition(async () => {
      try {
        await upsertSession({
          scheduleId,
          tenantId,
          sessionId,
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
            className="fixed inset-0 z-40 backdrop-blur-[2px]"
            style={{ background: "color-mix(in oklch, var(--foreground) 18%, transparent)" }}
            onClick={onClose}
          />
          <motion.aside
            key="session-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[1280px] flex-col"
            style={{
              background: "var(--app-background)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderLeft: `1px solid ${D.divider}`,
              boxShadow: "-8px 0 40px rgba(20,24,60,0.12)",
            }}
          >
            {/* ── ヘッダー ── */}
            <div
              className="flex shrink-0 items-center justify-between px-6 py-4"
              style={{ borderBottom: `1px solid ${D.divider}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: D.accentSoft }}
                >
                  <ClipboardList size={20} color={D.accent} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: D.ink }}>
                    実施記録
                  </h2>
                  {!loading && data && (
                    <p className="text-xs" style={{ color: D.ink3 }}>
                      {data.patientName}（担当：{data.therapistName}）
                    </p>
                  )}
                </div>
                {!loading && data && <StatusBadge status={currentStatus} />}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:opacity-80"
                  style={{
                    background: D.subtle,
                    border: `1px solid ${D.divider}`,
                    color: D.ink2,
                  }}
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  コピー用テキスト
                </button>
                <button
                  onClick={onClose}
                  className="hover:bg-muted flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                  style={{ color: D.ink3 }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── ボディ ── */}
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm" style={{ color: D.ink3 }}>
                  読み込み中...
                </p>
              </div>
            ) : fetchError ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <p className="text-sm text-red-600">{fetchError}</p>
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)] lg:overflow-hidden">
                {/* ── 左カラム（入力フォーム） ── */}
                <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
                  {/* 予約情報カード */}
                  {data && (
                    <div
                      className="flex shrink-0 items-center gap-3 rounded-3xl p-4"
                      style={{
                        background: D.card,
                        boxShadow: D.cardShadow,
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                        style={{ background: D.accentSoft }}
                      >
                        <Calendar size={20} color={D.accent} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold" style={{ color: D.ink3 }}>
                          予約
                        </p>
                        <p
                          className="text-base font-bold"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {format(new Date(data.scheduleStartAt), "M月d日")}{" "}
                          <span style={{ color: D.ink2 }}>
                            {format(new Date(data.scheduleStartAt), "HH:mm")} —{" "}
                            {format(new Date(data.scheduleEndAt), "HH:mm")}
                          </span>{" "}
                          <span style={{ color: D.accent }}>{data.scheduleUnits}単位</span>
                        </p>
                      </div>
                      {(initial || early) && (
                        <div
                          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                          style={{ background: D.warnSoft, color: "#b45309" }}
                        >
                          <AlertTriangle size={11} color={D.warn} />
                          {initial ? "初期加算対象" : "早期加算対象"} · 残
                          {initial ? initialDaysLeft : earlyDaysLeft}日
                        </div>
                      )}
                    </div>
                  )}

                  {/* 実施時刻・単位数・離床 */}
                  <div
                    className="grid shrink-0 grid-cols-1 gap-4 rounded-3xl p-5 sm:grid-cols-[minmax(280px,1fr)_minmax(150px,auto)] xl:grid-cols-[minmax(280px,1fr)_minmax(150px,auto)_minmax(220px,auto)]"
                    style={{
                      background: D.card,
                      boxShadow: D.cardShadow,
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    {/* 実施時刻 */}
                    <div className="flex min-w-0 flex-col gap-2">
                      <label
                        className="text-xs font-semibold"
                        style={{ color: D.ink3, letterSpacing: "0.02em" }}
                      >
                        実施時刻
                      </label>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
                        <div
                          className="min-w-0 rounded-xl px-3 py-2"
                          style={{ background: D.subtle }}
                        >
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => {
                              setStartTime(e.target.value);
                              recalcUnits(e.target.value, endTime);
                            }}
                            className="w-full bg-transparent text-sm font-bold focus:outline-none"
                            style={{
                              fontFamily: "var(--font-mono)",
                              color: D.ink,
                            }}
                          />
                        </div>
                        <span style={{ color: D.ink3, fontSize: 14 }}>〜</span>
                        <div
                          className="min-w-0 rounded-xl px-3 py-2"
                          style={{ background: D.subtle }}
                        >
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => {
                              setEndTime(e.target.value);
                              recalcUnits(startTime, e.target.value);
                            }}
                            className="w-full bg-transparent text-sm font-bold focus:outline-none"
                            style={{
                              fontFamily: "var(--font-mono)",
                              color: D.ink,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 単位数 */}
                    <div className="flex min-w-0 flex-col gap-2">
                      <label
                        className="text-xs font-semibold"
                        style={{ color: D.ink3, letterSpacing: "0.02em" }}
                      >
                        単位数
                      </label>
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className="flex items-center rounded-xl"
                          style={{ background: D.subtle }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(1, units - 1);
                              setUnits(next);
                              recalcEndTime(startTime, next);
                            }}
                            className="hover:bg-muted flex h-9 w-9 items-center justify-center rounded-l-xl text-base font-bold transition-colors"
                            style={{ color: D.ink2 }}
                          >
                            −
                          </button>
                          <span
                            className="min-w-[28px] text-center text-base font-bold"
                            style={{
                              fontFamily: "var(--font-mono)",
                              color: D.ink,
                            }}
                          >
                            {units}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.min(9, units + 1);
                              setUnits(next);
                              recalcEndTime(startTime, next);
                            }}
                            className="hover:bg-muted flex h-9 w-9 items-center justify-center rounded-r-xl text-base font-bold transition-colors"
                            style={{ color: D.ink2 }}
                          >
                            ＋
                          </button>
                        </div>
                        <span className="text-xs" style={{ color: D.ink3 }}>
                          単位
                        </span>
                      </div>
                    </div>

                    {/* 離床 */}
                    <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 xl:col-span-1">
                      <label
                        className="text-xs font-semibold"
                        style={{ color: D.ink3, letterSpacing: "0.02em" }}
                      >
                        離床
                      </label>
                      <div
                        className="grid w-full grid-cols-2 gap-1 rounded-xl p-1"
                        style={{ background: D.subtle }}
                      >
                        {(["あり", "なし（減算）"] as const).map((label) => {
                          const val = label === "あり";
                          const active = isAmbulatory === val;
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setIsAmbulatory(val)}
                              className="min-w-0 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                              style={
                                active
                                  ? {
                                      background: "var(--card)",
                                      color: D.ink,
                                      boxShadow: "0 2px 6px rgba(20,24,60,0.08)",
                                    }
                                  : { color: D.ink3 }
                              }
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* SOAP記録 */}
                  <div
                    className="flex flex-1 flex-col rounded-3xl p-4"
                    style={{
                      background: D.card,
                      boxShadow: D.cardShadow,
                      backdropFilter: "blur(10px)",
                      minHeight: 260,
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: D.ink }}>
                        記録（SOAP）
                      </span>
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ background: D.accentSoft, color: D.accent }}
                      >
                        完了時いずれか必須
                      </span>
                      <div
                        className="ml-auto flex cursor-pointer items-center gap-1 text-xs font-semibold"
                        style={{ color: D.accent }}
                      >
                        <Sparkles size={12} />
                        AI下書き
                      </div>
                    </div>
                    <div
                      className="flex-1"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gridTemplateRows: "1fr 1fr",
                        gap: 8,
                        minHeight: 0,
                      }}
                    >
                      <SoapBox
                        letter="S"
                        title="主観的情報"
                        value={soapS}
                        onChange={setSoapS}
                        placeholder="患者の訴え・自覚症状"
                      />
                      <SoapBox
                        letter="O"
                        title="客観的情報"
                        value={soapO}
                        onChange={setSoapO}
                        placeholder="バイタル・ROM・MMT など"
                      />
                      <SoapBox
                        letter="A"
                        title="評価"
                        value={soapA}
                        onChange={setSoapA}
                        placeholder="評価所見"
                      />
                      <SoapBox
                        letter="P"
                        title="計画"
                        value={soapP}
                        onChange={setSoapP}
                        placeholder="次回までの計画"
                      />
                    </div>
                  </div>
                </div>

                {/* ── 右カラム（算定加算 + コピー + ボタン） ── */}
                <div className="flex min-h-0 flex-col gap-3">
                  {/* 算定加算 */}
                  <div
                    className="shrink-0 rounded-3xl p-4"
                    style={{
                      background: D.card,
                      boxShadow: D.cardShadow,
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <p className="mb-3 text-sm font-bold" style={{ color: D.ink }}>
                      算定加算
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ADDITION_OPTIONS.map(({ key, label }) => {
                        const active = additions.includes(key);
                        const isAlert =
                          (key === "initial" && initial) || (key === "early_rehab" && early);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleAddition(key)}
                            className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition-all"
                            style={
                              active
                                ? {
                                    background: D.accent,
                                    color: D.accentFg,
                                    boxShadow: "0 6px 14px rgba(99,102,241,0.25)",
                                  }
                                : { background: D.subtle, color: D.ink2 }
                            }
                          >
                            {active && <Check size={11} />}
                            {label}
                            {isAlert && !active && (
                              <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* コピー用テキスト */}
                  <div
                    className="flex flex-1 flex-col rounded-3xl p-4"
                    style={{
                      background: D.card,
                      boxShadow: D.cardShadow,
                      backdropFilter: "blur(10px)",
                      minHeight: 0,
                    }}
                  >
                    <p className="mb-2 text-sm font-bold" style={{ color: D.ink }}>
                      コピー用テキスト
                    </p>
                    <div
                      className="flex-1 overflow-y-auto rounded-2xl p-3 text-xs leading-relaxed"
                      style={{
                        background: D.subtle,
                        fontFamily: "var(--font-mono)",
                        color: D.ink2,
                        whiteSpace: "pre-wrap",
                        minHeight: 0,
                      }}
                    >
                      {copyText}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-colors hover:opacity-80"
                      style={{
                        background: D.subtle,
                        border: `1px solid ${D.divider}`,
                        color: D.ink2,
                      }}
                    >
                      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      {copied ? "コピー済み" : "クリップボードにコピー"}
                    </button>
                  </div>

                  {/* エラー */}
                  {saveError && (
                    <p className="border-destructive/20 bg-destructive/10 text-destructive shrink-0 rounded-2xl border px-4 py-2 text-sm">
                      {saveError}
                    </p>
                  )}

                  {/* 保存ボタン */}
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSave("draft")}
                      className="flex-1 rounded-2xl py-3.5 text-sm font-semibold transition-colors hover:opacity-80 disabled:opacity-50"
                      style={{
                        background: D.subtle,
                        border: `1px solid ${D.divider}`,
                        color: D.ink2,
                      }}
                    >
                      {isPending ? "保存中..." : "一時保存"}
                    </button>
                    <button
                      type="button"
                      disabled={isPending || !canComplete}
                      onClick={() => handleSave("completed")}
                      title={!canComplete ? "単位数とSOAPを入力してください" : undefined}
                      className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-semibold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        background: D.accent,
                        color: D.accentFg,
                        boxShadow: "0 8px 18px rgba(99,102,241,0.3)",
                      }}
                    >
                      <CheckCircle size={16} />
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
