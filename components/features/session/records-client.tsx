"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Printer, Search } from "lucide-react";
import { getSessionRecords, type SessionRecord } from "@/lib/actions/session";
import type { PatientRow } from "@/lib/actions/patient";
import type { Staff } from "@/lib/types";
import { ADDITION_OPTIONS } from "@/lib/constants/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SessionPanel from "./session-panel";

const DISEASE_LABEL: Record<PatientRow["disease_category"], string> = {
  cerebrovascular: "脳血管疾患等",
  musculoskeletal: "運動器",
  disuse_syndrome: "廃用症候群",
  cardiovascular: "心大血管",
  respiratory: "呼吸器",
};

const STATUS_LABEL: Record<SessionRecord["status"], string> = {
  scheduled: "未記録",
  draft: "一時保存",
  completed: "実施済み",
};

const ADDITION_LABEL: Map<string, string> = new Map(ADDITION_OPTIONS.map((o) => [o.key, o.label]));

type Props = {
  tenantId: string;
  initialRecords: SessionRecord[];
  initialFrom: string;
  initialTo: string;
  initialPatientId?: string;
  patients: PatientRow[];
  staffs: Staff[];
};

function compactDate(date: string) {
  return format(new Date(`${date}T00:00:00`), "yyyy/MM/dd");
}

function hasStaff(patient: PatientRow, staffId: string) {
  return (
    patient.therapist_id === staffId ||
    patient.pt_therapist_id === staffId ||
    patient.ot_therapist_id === staffId ||
    patient.st_therapist_id === staffId
  );
}

export default function RecordsClient({
  tenantId,
  initialRecords,
  initialFrom,
  initialTo,
  initialPatientId,
  patients,
  staffs,
}: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId ?? "");
  const [therapistFilter, setTherapistFilter] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [records, setRecords] = useState<SessionRecord[]>(initialRecords);
  const [hasDisplayed, setHasDisplayed] = useState(!!initialPatientId);
  const [panelScheduleId, setPanelScheduleId] = useState<string | null>(null);
  const [panelSessionId, setPanelSessionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  const candidatePatients = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return patients.filter((p) => {
      if (therapistFilter && !hasStaff(p, therapistFilter)) return false;
      if (diseaseFilter && p.disease_category !== diseaseFilter) return false;
      if (!q) return true;
      return (
        p.name_kanji.toLowerCase().includes(q) ||
        p.name_kana.toLowerCase().includes(q) ||
        p.patient_code.toLowerCase().includes(q)
      );
    });
  }, [patients, therapistFilter, diseaseFilter, keyword]);

  const totalUnits = records.reduce((sum, r) => sum + (r.units ?? 0), 0);
  const completedCount = records.filter((r) => r.status === "completed").length;

  const displayRecords = () => {
    if (!selectedPatientId) return;
    startTransition(async () => {
      const next = await getSessionRecords(tenantId, from, to, selectedPatientId);
      setRecords(next);
      setHasDisplayed(true);
      const params = new URLSearchParams({ patient_id: selectedPatientId, from, to });
      router.replace(`/records?${params.toString()}`, { scroll: false });
    });
  };

  const refreshRecords = () => {
    if (!selectedPatientId) return;
    startTransition(async () => {
      setRecords(await getSessionRecords(tenantId, from, to, selectedPatientId));
    });
  };

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden p-6 print:p-0">
        <div className="no-print mb-5 flex shrink-0 items-center justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight">実施記録一覧</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              患者を1人に絞り込み、期間を指定して記録を表示します
            </p>
          </div>
          <Button
            type="button"
            onClick={() => window.print()}
            disabled={!hasDisplayed || records.length === 0}
            className="rounded-full shadow-[0_8px_18px_rgba(99,102,241,0.28)]"
          >
            <Printer size={15} />
            印刷
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="no-print glass-card min-h-0 overflow-hidden p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>開始日</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>終了日</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>担当者</Label>
                <select
                  value={therapistFilter}
                  onChange={(e) => {
                    setTherapistFilter(e.target.value);
                    setSelectedPatientId("");
                  }}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:ring-3"
                >
                  <option value="">すべて</option>
                  {staffs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}（{s.occupation.toUpperCase()}）
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>算定区分</Label>
                <select
                  value={diseaseFilter}
                  onChange={(e) => {
                    setDiseaseFilter(e.target.value);
                    setSelectedPatientId("");
                  }}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:ring-3"
                >
                  <option value="">すべて</option>
                  {Object.entries(DISEASE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>患者検索</Label>
                <div className="relative">
                  <Search
                    size={14}
                    className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2"
                  />
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="氏名・カナ・患者ID"
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="border-border bg-card/55 rounded-xl border">
                <div className="border-border flex items-center justify-between border-b px-3 py-2">
                  <span className="text-muted-foreground text-xs font-medium">
                    患者候補 {candidatePatients.length}名
                  </span>
                  {selectedPatient && (
                    <button
                      type="button"
                      onClick={() => setSelectedPatientId("")}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      選択解除
                    </button>
                  )}
                </div>
                <div className="max-h-[34vh] overflow-y-auto p-1.5">
                  {candidatePatients.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                      条件に一致する患者がいません
                    </p>
                  ) : (
                    candidatePatients.map((p) => {
                      const selected = p.id === selectedPatientId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPatientId(p.id)}
                          className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
                            selected ? "bg-primary text-primary-foreground" : "hover:bg-card"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">{p.name_kanji}</span>
                            <span
                              className={`shrink-0 text-[10px] ${
                                selected ? "text-primary-foreground/75" : "text-muted-foreground"
                              }`}
                            >
                              {p.patient_code}
                            </span>
                          </div>
                          <p
                            className={`mt-0.5 text-xs ${selected ? "text-primary-foreground/75" : "text-muted-foreground"}`}
                          >
                            {DISEASE_LABEL[p.disease_category]} · {p.therapist_name}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <Button
                type="button"
                onClick={displayRecords}
                disabled={!selectedPatientId || !from || !to || isPending}
                className="w-full"
              >
                {isPending ? "表示中..." : "表示"}
              </Button>
            </div>
          </aside>

          <section className="min-h-0 overflow-auto print:overflow-visible">
            <div className="print-sheet bg-card text-card-foreground mx-auto min-h-full shadow-[0_10px_30px_rgba(20,24,60,0.06),0_0_0_1px_rgba(20,24,60,0.04)]">
              {!hasDisplayed ? (
                <div className="flex min-h-[520px] items-center justify-center p-10 text-center">
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      表示条件を指定してください
                    </p>
                    <p className="text-muted-foreground mt-2 text-sm">
                      左側で患者を1人選び、期間を指定して「表示」を押すと印刷用の一覧が出ます。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="record-print p-6">
                  <div className="border-border mb-5 flex items-start justify-between gap-4 border-b pb-4">
                    <div>
                      <p className="text-muted-foreground text-xs">実施記録一覧</p>
                      <h2 className="mt-1 text-xl font-bold tracking-tight">
                        {selectedPatient?.name_kanji ?? "患者未選択"}
                      </h2>
                      {selectedPatient && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          患者ID {selectedPatient.patient_code} · {selectedPatient.name_kana}
                        </p>
                      )}
                    </div>
                    <div className="text-muted-foreground text-right text-xs leading-5">
                      <p>
                        期間: {compactDate(from)} - {compactDate(to)}
                      </p>
                      <p>
                        件数: {records.length}件 / 実施済み {completedCount}件 / {totalUnits}単位
                      </p>
                      {selectedPatient && (
                        <p>算定区分: {DISEASE_LABEL[selectedPatient.disease_category]}</p>
                      )}
                    </div>
                  </div>

                  {records.length === 0 ? (
                    <div className="border-border text-muted-foreground rounded-lg border py-16 text-center text-sm">
                      指定期間の記録はありません。
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {records.map((record) => (
                        <article
                          key={record.id}
                          className="record-item border-border bg-card rounded-lg border p-2.5"
                          onDoubleClick={() => {
                            if (record.scheduleId) {
                              setPanelScheduleId(record.scheduleId);
                              setPanelSessionId(record.id);
                            }
                          }}
                        >
                          <div className="grid grid-cols-[78px_78px_1fr_54px_64px] items-center gap-2 text-xs">
                            <p className="font-semibold tabular-nums">
                              {compactDate(record.sessionDate)}
                            </p>
                            <p className="text-muted-foreground tabular-nums">
                              {record.actualStartTime && record.actualEndTime
                                ? `${record.actualStartTime}-${record.actualEndTime}`
                                : "-"}
                            </p>
                            <p className="text-foreground truncate font-medium">
                              {record.therapistName}
                            </p>
                            <p className="text-right font-semibold">{record.units ?? "-"}単位</p>
                            <p className="text-muted-foreground text-right">
                              {STATUS_LABEL[record.status]}
                            </p>
                          </div>

                          <div className="mt-1.5 grid grid-cols-[1fr_1fr] gap-x-3 gap-y-1 text-[11px] leading-snug">
                            <PrintLine label="S" value={record.soapSubjective} />
                            <PrintLine label="O" value={record.soapObjective} />
                            <PrintLine label="A" value={record.soapAssessment} />
                            <PrintLine label="P" value={record.soapPlan} />
                          </div>

                          <div className="border-border text-muted-foreground mt-1.5 flex items-center gap-3 border-t pt-1.5 text-[10px]">
                            <span>離床: {record.isAmbulatory ? "可" : "不可"}</span>
                            <span className="truncate">
                              加算:{" "}
                              {record.additions.length
                                ? record.additions
                                    .map((key) => ADDITION_LABEL.get(key) ?? key)
                                    .join("、")
                                : "-"}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <SessionPanel
        scheduleId={panelScheduleId}
        sessionId={panelSessionId}
        tenantId={tenantId}
        onClose={() => {
          setPanelScheduleId(null);
          setPanelSessionId(null);
        }}
        onSaved={refreshRecords}
      />

      <style jsx global>{`
        .print-sheet {
          width: min(100%, 210mm);
          border-radius: 1.5rem;
          overflow: hidden;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html,
          body {
            background: #fff !important;
          }

          aside,
          nav,
          .no-print {
            display: none !important;
          }

          main {
            padding-left: 0 !important;
            padding-bottom: 0 !important;
          }

          .print-sheet {
            width: auto !important;
            min-height: auto !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .record-print {
            padding: 0 !important;
            font-size: 10px !important;
            line-height: 1.35 !important;
          }

          .record-print h2 {
            font-size: 16px !important;
            line-height: 1.2 !important;
          }

          .record-print > div:first-child {
            margin-bottom: 4mm !important;
            padding-bottom: 3mm !important;
          }

          .record-item {
            break-inside: avoid;
            page-break-inside: avoid;
            -webkit-column-break-inside: avoid;
            padding: 2.4mm !important;
            border-color: #d9dce8 !important;
            border-radius: 3mm !important;
          }

          .record-item + .record-item {
            margin-top: 2mm !important;
          }

          .record-line {
            min-width: 0;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .record-line-value {
            white-space: pre-wrap !important;
            overflow-wrap: anywhere;
          }
        }
      `}</style>
    </>
  );
}

function PrintLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="record-line flex min-w-0 gap-1">
      <span className="text-primary shrink-0 font-bold">{label}</span>
      <span className="record-line-value text-foreground">{value?.trim() || "-"}</span>
    </div>
  );
}
