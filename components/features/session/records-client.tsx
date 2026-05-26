"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Check, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { getSessionRecords, type SessionRecord } from "@/lib/actions/session";
import { ADDITION_OPTIONS } from "@/lib/constants/session";

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

function buildCopyText(r: SessionRecord): string {
  const additionLabels = r.additions
    .map((k) => ADDITION_OPTIONS.find((o) => o.key === k)?.label)
    .filter(Boolean)
    .join("・");

  const lines: string[] = [
    `【実施記録】`,
    `患者: ${r.patientName}`,
    `実施日: ${format(new Date(r.sessionDate + "T00:00:00"), "yyyy年M月d日")}`,
    `担当療法士: ${r.therapistName}`,
    `実施時刻: ${r.actualStartTime ?? ""}〜${r.actualEndTime ?? ""}（${r.units ?? "?"}単位）`,
    `離床: ${r.isAmbulatory ? "あり" : "なし（減算）"}`,
    ...(additionLabels ? [`算定加算: ${additionLabels}`] : []),
    "",
  ];
  if (r.soapSubjective?.trim()) lines.push(`S（主観）:\n${r.soapSubjective.trim()}`, "");
  if (r.soapObjective?.trim()) lines.push(`O（客観）:\n${r.soapObjective.trim()}`, "");
  if (r.soapAssessment?.trim()) lines.push(`A（評価）:\n${r.soapAssessment.trim()}`, "");
  if (r.soapPlan?.trim()) lines.push(`P（計画）:\n${r.soapPlan.trim()}`, "");

  return lines.join("\n").trimEnd();
}

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = () => {
    startTransition(async () => {
      const result = await getSessionRecords(tenantId, from, to, patientId);
      setRecords(result);
      setSelectedId(null);
    });
  };

  const handleCopy = async (record: SessionRecord) => {
    await navigator.clipboard.writeText(buildCopyText(record));
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const selectedRecord = records.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      {/* ヘッダー */}
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-bold text-[#111]">実施記録</h1>
        {patientName && (
          <span className="rounded-full bg-[#6366f1]/10 px-3 py-0.5 text-sm text-[#6366f1]">
            {patientName}
          </span>
        )}
      </div>

      {/* フィルター */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-[#888]">開始日</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-[#eaeaea] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
          />
        </div>
        <span className="mb-2 text-[#888]">〜</span>
        <div>
          <label className="mb-1 block text-xs text-[#888]">終了日</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-[#eaeaea] px-3 py-2 text-sm focus:border-[#111] focus:outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isPending}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-50"
        >
          {isPending ? "検索中..." : "検索"}
        </button>
        {patientId && (
          <button
            onClick={() => router.push("/records")}
            className="rounded-lg border border-[#eaeaea] px-4 py-2 text-sm text-[#888] transition-colors hover:bg-[#fafafa]"
          >
            全患者を表示
          </button>
        )}
      </div>

      {/* 2カラムレイアウト */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* 左：一覧 */}
        <div className="flex w-96 shrink-0 flex-col overflow-hidden rounded-xl border border-[#eaeaea] bg-white">
          {records.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[#888]">
              {isPending ? "読み込み中..." : "記録がありません"}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {records.map((record) => {
                const isSelected = record.id === selectedId;
                return (
                  <button
                    key={record.id}
                    onClick={() => setSelectedId(isSelected ? null : record.id)}
                    className={`flex w-full items-start gap-3 border-b border-[#eaeaea] px-4 py-3 text-left transition-colors last:border-0 ${
                      isSelected ? "bg-[#6366f1]/10" : "hover:bg-[#fafafa]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-[#111]">
                          {record.patientName}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[record.status] ?? STATUS_STYLE.scheduled}`}
                        >
                          {STATUS_LABEL[record.status]}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-[#888]">
                        <span>{format(new Date(record.sessionDate + "T00:00:00"), "M月d日")}</span>
                        <span>·</span>
                        <span>{record.therapistName}</span>
                        {record.units && <span>· {record.units}単位</span>}
                        {record.actualStartTime && record.actualEndTime && (
                          <span className="tabular-nums">
                            · {record.actualStartTime}〜{record.actualEndTime}
                          </span>
                        )}
                      </div>
                      {record.additions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {record.additions.map((k) => {
                            const opt = ADDITION_OPTIONS.find((o) => o.key === k);
                            return opt ? (
                              <span
                                key={k}
                                className="rounded-full bg-[#6366f1]/10 px-2 py-0.5 text-[10px] text-[#6366f1]"
                              >
                                {opt.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    <ChevronDown
                      size={14}
                      className={`mt-1 shrink-0 text-[#888] transition-transform ${isSelected ? "rotate-180" : ""}`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 右：コピー用テキスト */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[#eaeaea] bg-white">
          {!selectedRecord ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[#888]">
              左の一覧から記録を選択するとコピー用テキストが表示されます
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-[#eaeaea] px-5 py-3">
                <div>
                  <span className="text-sm font-medium text-[#111]">
                    {selectedRecord.patientName}
                  </span>
                  <span className="ml-2 text-xs text-[#888]">
                    {format(new Date(selectedRecord.sessionDate + "T00:00:00"), "M月d日")}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(selectedRecord)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#eaeaea] px-3 py-1.5 text-sm font-medium text-[#111] transition-colors hover:bg-[#fafafa]"
                >
                  {copiedId === selectedRecord.id ? (
                    <Check size={14} className="text-green-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                  {copiedId === selectedRecord.id ? "コピー済み" : "コピー"}
                </button>
              </div>
              <textarea
                readOnly
                value={buildCopyText(selectedRecord)}
                className="flex-1 resize-none p-5 font-mono text-sm leading-relaxed text-[#333] focus:outline-none"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
