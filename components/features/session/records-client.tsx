"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { getSessionRecords, type SessionRecord } from "@/lib/actions/session";
import { ADDITION_OPTIONS } from "@/lib/constants/session";
import { Search, Filter } from "lucide-react";
import SessionPanel from "./session-panel";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "未記録",
  draft: "一時保存",
  completed: "実施済み",
};

const STATUS_COLOR: Record<string, { bg: string; fg: string; dot: string }> = {
  scheduled: { bg: "rgba(20,24,60,0.06)", fg: "#5a5e72", dot: "#8a8fa3" },
  draft: { bg: "rgba(245,158,11,0.14)", fg: "#b45309", dot: "#f59e0b" },
  completed: { bg: "rgba(34,197,94,0.12)", fg: "#15803d", dot: "#22c55e" },
};

const D = {
  ink: "#1d1f2b",
  ink2: "#5a5e72",
  ink3: "#8a8fa3",
  accent: "#6366f1",
  accentSoft: "rgba(99,102,241,0.12)",
  divider: "rgba(20,24,60,0.06)",
};

type Props = {
  tenantId: string;
  initialRecords: SessionRecord[];
  initialFrom: string;
  initialTo: string;
  patientName?: string;
};

export default function RecordsClient({
  tenantId,
  initialRecords,
  initialFrom,
  initialTo,
  patientName,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patient_id") ?? undefined;

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [records, setRecords] = useState<SessionRecord[]>(initialRecords);
  const [panelScheduleId, setPanelScheduleId] = useState<string | null>(null);
  const [panelSessionId, setPanelSessionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const handleSearch = () => {
    startTransition(async () => {
      const result = await getSessionRecords(tenantId, from, to, patientId);
      setRecords(result);
    });
  };

  const handleRowClick = (record: SessionRecord) => {
    if (!record.scheduleId) return;
    setPanelScheduleId(record.scheduleId);
    setPanelSessionId(record.id);
  };

  const handlePanelClose = () => {
    setPanelScheduleId(null);
    setPanelSessionId(null);
  };

  const handlePanelSaved = () => {
    startTransition(async () => {
      const result = await getSessionRecords(tenantId, from, to, patientId);
      setRecords(result);
    });
  };

  const filtered = search
    ? records.filter((r) => r.patientName.includes(search) || r.therapistName.includes(search))
    : records;

  return (
    <>
      <div className="flex h-full flex-col p-6">
        {/* ヘッダー */}
        <div className="mb-5 flex shrink-0 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: D.ink }}>
              実施記録
            </h1>
            {patientName && (
              <span
                className="mt-1 inline-block rounded-full px-3 py-0.5 text-sm"
                style={{ background: D.accentSoft, color: D.accent }}
              >
                {patientName}
              </span>
            )}
          </div>
          {patientId && (
            <button
              onClick={() => router.push("/records")}
              className="rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:opacity-80"
              style={{
                background: "rgba(255,255,255,0.7)",
                border: `1px solid ${D.divider}`,
                color: D.ink2,
              }}
            >
              全患者を表示
            </button>
          )}
        </div>

        {/* フィルターバー */}
        <div
          className="mb-4 flex shrink-0 flex-wrap items-center gap-3 rounded-3xl px-4 py-3"
          style={{
            background: "rgba(255,255,255,0.78)",
            boxShadow: "0 10px 30px rgba(20,24,60,0.06), 0 0 0 1px rgba(20,24,60,0.04)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* 検索 */}
          <div className="relative min-w-[180px] flex-1">
            <Search
              size={14}
              className="absolute top-1/2 left-3 -translate-y-1/2"
              style={{ color: D.ink3 }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="患者名・担当者で絞り込み"
              className="w-full rounded-full bg-transparent py-1.5 pr-3 pl-8 text-sm focus:outline-none"
              style={{ color: D.ink }}
            />
          </div>

          <div className="h-5 w-px" style={{ background: D.divider }} />

          {/* 日付レンジ */}
          <div className="flex items-center gap-2">
            <Filter size={13} style={{ color: D.ink3 }} />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border-none bg-transparent px-2 py-1 text-sm focus:outline-none"
              style={{ color: D.ink }}
            />
            <span style={{ color: D.ink3, fontSize: 13 }}>〜</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border-none bg-transparent px-2 py-1 text-sm focus:outline-none"
              style={{ color: D.ink }}
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={isPending}
            className="rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            style={{
              background: D.accent,
              color: "#fff",
              boxShadow: "0 6px 14px rgba(99,102,241,0.25)",
            }}
          >
            {isPending ? "検索中..." : "検索"}
          </button>

          <span className="text-sm" style={{ color: D.ink3 }}>
            {filtered.length}件
          </span>
        </div>

        {/* レコードリスト */}
        <div
          className="flex-1 overflow-hidden rounded-3xl"
          style={{
            background: "rgba(255,255,255,0.78)",
            boxShadow: "0 10px 30px rgba(20,24,60,0.06), 0 0 0 1px rgba(20,24,60,0.04)",
            backdropFilter: "blur(10px)",
          }}
        >
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm" style={{ color: D.ink3 }}>
                {isPending ? "読み込み中..." : "記録がありません"}
              </p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              {/* テーブルヘッダー */}
              <div
                className="grid px-6 py-4 text-xs font-semibold"
                style={{
                  gridTemplateColumns: "100px 1fr 90px 110px 1fr auto",
                  color: D.ink3,
                  borderBottom: `1px solid ${D.divider}`,
                  letterSpacing: "0.02em",
                }}
              >
                <div>日付</div>
                <div>患者名</div>
                <div>単位</div>
                <div>実施時刻</div>
                <div>算定加算</div>
                <div>ステータス</div>
              </div>

              {filtered.map((record, i) => {
                const sc = STATUS_COLOR[record.status] ?? STATUS_COLOR["scheduled"]!;
                const canOpen = !!record.scheduleId;
                return (
                  <div
                    key={record.id}
                    onClick={() => handleRowClick(record)}
                    className="grid items-center px-6 py-4 transition-colors"
                    style={{
                      gridTemplateColumns: "100px 1fr 90px 110px 1fr auto",
                      borderTop: i === 0 ? "none" : `1px solid ${D.divider}`,
                      cursor: canOpen ? "pointer" : "default",
                    }}
                    onMouseEnter={(e) => {
                      if (canOpen)
                        (e.currentTarget as HTMLDivElement).style.background =
                          "rgba(20,24,60,0.018)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    }}
                  >
                    {/* 日付 */}
                    <div
                      className="text-sm font-semibold tabular-nums"
                      style={{
                        fontFamily: "var(--font-geist-mono, monospace)",
                        color: D.ink,
                      }}
                    >
                      {format(new Date(record.sessionDate + "T00:00:00"), "M/d")}
                    </div>

                    {/* 患者名 + 担当者 */}
                    <div>
                      <p className="text-sm font-semibold" style={{ color: D.ink }}>
                        {record.patientName}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: D.ink3 }}>
                        {record.therapistName}
                      </p>
                    </div>

                    {/* 単位数 */}
                    <div className="text-sm" style={{ color: D.ink2 }}>
                      {record.units != null ? (
                        <span>
                          <span className="font-bold" style={{ color: D.accent }}>
                            {record.units}
                          </span>
                          <span className="text-xs" style={{ color: D.ink3 }}>
                            {" "}
                            単位
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: D.ink3 }}>—</span>
                      )}
                    </div>

                    {/* 実施時刻 */}
                    <div
                      className="text-xs tabular-nums"
                      style={{
                        fontFamily: "var(--font-geist-mono, monospace)",
                        color: D.ink2,
                      }}
                    >
                      {record.actualStartTime && record.actualEndTime
                        ? `${record.actualStartTime}〜${record.actualEndTime}`
                        : "—"}
                    </div>

                    {/* 算定加算 */}
                    <div className="flex flex-wrap gap-1">
                      {record.additions.length === 0 ? (
                        <span style={{ color: D.ink3, fontSize: 12 }}>—</span>
                      ) : (
                        record.additions.slice(0, 2).map((k) => {
                          const opt = ADDITION_OPTIONS.find((o) => o.key === k);
                          return opt ? (
                            <span
                              key={k}
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ background: D.accentSoft, color: D.accent }}
                            >
                              {opt.label}
                            </span>
                          ) : null;
                        })
                      )}
                      {record.additions.length > 2 && (
                        <span className="text-[10px]" style={{ color: D.ink3 }}>
                          +{record.additions.length - 2}
                        </span>
                      )}
                    </div>

                    {/* ステータス */}
                    <div>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ background: sc.bg, color: sc.fg }}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: sc.dot }}
                        />
                        {STATUS_LABEL[record.status]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SessionPanel */}
      <SessionPanel
        scheduleId={panelScheduleId}
        sessionId={panelSessionId}
        tenantId={tenantId}
        onClose={handlePanelClose}
        onSaved={handlePanelSaved}
      />
    </>
  );
}
