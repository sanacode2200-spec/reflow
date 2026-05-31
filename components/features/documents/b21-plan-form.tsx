"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ChevronLeft, Pencil, Printer, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PatientRow } from "@/lib/actions/patient";
import {
  createRehabDocument,
  deleteRehabDocument,
  updateRehabDocument,
} from "@/lib/actions/rehab-document";
import type { RehabDocumentRow } from "@/lib/db/schema/rehab-documents";
import { rehabDocumentSchema, type RehabDocumentFormData } from "@/lib/validators/rehab-document";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  tenantId: string;
  patient: PatientRow;
  document?: RehabDocumentRow;
  backHref: string;
};

// ── 定数 ─────────────────────────────────────────────────────

// （BODY_FUNCTION 定数は BodyFunctionSection 内に直接定義）

const BASIC_MOVEMENTS = [
  "寝返り",
  "起き上がり",
  "立ち上がり",
  "座位保持",
  "立位保持",
  "その他",
] as const;

const BM_LEVELS = ["自立", "一部介助", "介助", "非実施"] as const;

const FIM_MOTOR: { label: string; items: string[] }[] = [
  {
    label: "セルフケア",
    items: ["食事", "整容", "清拭", "更衣（上半身）", "更衣（下半身）", "トイレ動作"],
  },
  { label: "排泄コントロール", items: ["排尿管理", "排便管理"] },
  { label: "移乗", items: ["ベッド・椅子・車椅子", "トイレ", "浴槽・シャワー"] },
  { label: "移動", items: ["歩行・車椅子", "階段"] },
];

const FIM_COGNITIVE: { label: string; items: string[] }[] = [
  { label: "コミュニケーション", items: ["理解", "表出"] },
  { label: "社会的認知", items: ["社会的交流", "問題解決", "記憶"] },
];

const FIM_GROUPS = [...FIM_MOTOR, ...FIM_COGNITIVE];

const FIM_SCALE = [
  { score: 7, label: "完全自立" },
  { score: 6, label: "修正自立" },
  { score: 5, label: "監視・準備" },
  { score: 4, label: "最小介助" },
  { score: 3, label: "中等度介助" },
  { score: 2, label: "最大介助" },
  { score: 1, label: "全介助" },
];

// ── ユーティリティ ────────────────────────────────────────────

const genderLabel = { male: "男", female: "女", other: "その他" } as const;

function calcAge(birthDate: string | null | undefined): string {
  if (!birthDate) return "—";
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years -= 1;
  return String(years);
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${y}年${m}月${d}日`;
}

function defaultFimScores(): Record<string, number | null> {
  const s: Record<string, number | null> = {};
  for (const g of FIM_GROUPS) for (const item of g.items) s[item] = null;
  return s;
}

// ── 共通 UI ──────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-neutral-200 pb-1 text-xs font-bold tracking-wide text-neutral-500 uppercase print:mb-0 print:pb-0 print:text-[7pt]">
      {children}
    </h2>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-0.5 block text-[11px] font-medium text-neutral-400 print:mb-0 print:text-[7pt]">
      {children}
    </span>
  );
}

const inputCls =
  "w-full rounded border border-neutral-200 bg-white px-2 py-1 text-[13px] text-neutral-900 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 placeholder:text-neutral-300";

const textareaCls =
  "w-full resize-y rounded border border-neutral-200 bg-white px-2 py-1.5 text-[13px] text-neutral-900 leading-snug outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 placeholder:text-neutral-300 print:!h-4 print:!min-h-0 print:!overflow-hidden print:!resize-none print:!py-0 print:!px-0.5 print:!text-[7.5pt]";

function ReadValue({ value }: { value: string | null | undefined }) {
  return (
    <p className="min-h-[1.4rem] text-[13px] whitespace-pre-wrap text-neutral-900 print:min-h-0 print:text-[7.5pt] print:leading-none">
      {value || <span className="text-neutral-300">—</span>}
    </p>
  );
}

function TextInput({
  readOnly,
  value,
  onChange,
  placeholder,
}: {
  readOnly: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  if (readOnly) return <ReadValue value={value} />;
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

function TextArea({
  readOnly,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  readOnly: boolean;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  if (readOnly) return <ReadValue value={value} />;
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={textareaCls}
    />
  );
}

// ── 心身機能・構造（B21 別紙様式21 完全準拠） ────────────────

type BfCtx = {
  checks: Record<string, boolean>;
  texts: Record<string, string>;
  onCheck: (id: string, v: boolean) => void;
  onText: (id: string, v: string) => void;
  readOnly: boolean;
};

function BfCb({ c, id }: { c: BfCtx; id: string }) {
  const checked = c.checks[id] ?? false;
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={c.readOnly}
      onChange={(e) => !c.readOnly && c.onCheck(id, e.target.checked)}
      className="h-3 w-3 shrink-0 cursor-pointer accent-indigo-500 disabled:cursor-default"
    />
  );
}
function BfTi({ c, id, w = "w-14" }: { c: BfCtx; id: string; w?: string }) {
  const v = c.texts[id] ?? "";
  if (c.readOnly)
    return (
      <span
        className={cn(
          w,
          "inline-block min-h-[14px] border-b border-neutral-400 px-0.5 text-[11px] text-neutral-900"
        )}
      >
        {v}
      </span>
    );
  return (
    <input
      type="text"
      value={v}
      onChange={(e) => c.onText(id, e.target.value)}
      className={cn(
        w,
        "border-b border-neutral-400 bg-transparent px-0.5 text-[11px] text-neutral-900 outline-none focus:border-indigo-400"
      )}
    />
  );
}
function BfL({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] leading-none text-neutral-700">{children}</span>;
}
function BfCL({ c, id, label }: { c: BfCtx; id: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <BfCb c={c} id={id} />
      <BfL>{label}</BfL>
    </span>
  );
}
function BfRow({
  c,
  id,
  label,
  tk,
  w,
}: {
  c: BfCtx;
  id: string;
  label: string;
  tk?: string;
  w?: string;
}) {
  return (
    <div className="flex items-baseline gap-0.5 py-px">
      <BfCb c={c} id={id} />
      <BfL>{label}</BfL>
      {tk && (
        <>
          <BfL>（</BfL>
          <BfTi c={c} id={tk} w={w} />
          <BfL>）</BfL>
        </>
      )}
    </div>
  );
}

function BodyFunctionSection({
  checks,
  texts,
  onCheck,
  onText,
  readOnly,
}: {
  checks: Record<string, boolean>;
  texts: Record<string, string>;
  onCheck: (id: string, v: boolean) => void;
  onText: (id: string, v: string) => void;
  readOnly: boolean;
}) {
  const c: BfCtx = { checks, texts, onCheck, onText, readOnly };

  return (
    <div className="grid grid-cols-2 gap-x-6 text-[11px]">
      {/* ── 左列 ─────────────────────────────────── */}
      <div className="space-y-px">
        {/* 意識障害 */}
        <BfRow c={c} id="consciousness" label="意識障害（JCS・GCS" tk="consciousness" w="w-20" />

        {/* 呼吸機能障害 */}
        <BfRow c={c} id="respiratory" label="呼吸機能障害" />
        <div className="ml-3 flex flex-wrap items-baseline gap-x-2 gap-y-px">
          <span className="inline-flex items-baseline gap-0.5">
            <BfCb c={c} id="oxygen" />
            <BfL>酸素療法（</BfL>
            <BfTi c={c} id="oxygen_lmin" w="w-10" />
            <BfL>）L/min</BfL>
          </span>
          <BfCL c={c} id="tracheotomy" label="気切" />
          <BfCL c={c} id="ventilator" label="人工呼吸器" />
        </div>

        {/* 循環障害 */}
        <BfRow c={c} id="circulation" label="循環障害" />
        <div className="ml-3 flex flex-wrap items-baseline gap-x-2 gap-y-px">
          <span className="inline-flex items-baseline gap-0.5">
            <BfL>EF（</BfL>
            <BfTi c={c} id="ef" w="w-10" />
            <BfL>）%</BfL>
          </span>
          <span className="inline-flex items-baseline gap-0.5">
            <BfL>不整脈（</BfL>
            <BfCL c={c} id="arrhythmia_yes" label="有" />
            <BfL>　</BfL>
            <BfCL c={c} id="arrhythmia_no" label="無" />
            <BfL>）</BfL>
          </span>
        </div>

        {/* 危険因子 */}
        <BfRow c={c} id="risk_factors" label="危険因子" />
        <div className="ml-3 grid grid-cols-3 gap-x-2 gap-y-px">
          {[
            ["hypertension", "高血圧"],
            ["dyslipidemia", "脂質異常症"],
            ["diabetes", "糖尿病"],
            ["obesity", "肥満"],
            ["hyperuricemia", "高尿酸血症"],
            ["ckd", "慢性腎臓病"],
            ["family_history", "家族歴"],
            ["angina", "狭心症"],
            ["old_mi", "陳旧性心筋梗塞"],
          ].map(([id, lbl]) => (
            <BfCL c={c} key={id!} id={id!} label={lbl!} />
          ))}
        </div>

        {/* 以降 単純行 */}
        <BfRow c={c} id="dysphagia" label="摂食嚥下障害" tk="dysphagia_note" w="w-28" />
        <BfRow c={c} id="malnutrition" label="栄養障害" tk="malnutrition_note" w="w-28" />
        <BfRow c={c} id="incontinence" label="排泄機能障害" tk="incontinence_note" w="w-28" />
        <BfRow c={c} id="pressure_ulcer" label="褥瘡" tk="pressure_ulcer_note" w="w-28" />
        <BfRow c={c} id="pain" label="疼痛" tk="pain_note" w="w-28" />
        <BfRow c={c} id="bf_other" label="その他" tk="bf_other_note" w="w-28" />
      </div>

      {/* ── 右列 ─────────────────────────────────── */}
      <div className="space-y-px">
        <BfRow c={c} id="rom" label="関節可動域制限" tk="rom_note" w="w-24" />
        <BfRow c={c} id="contracture" label="拘縮・変形" tk="contracture_note" w="w-24" />
        <BfRow c={c} id="weakness" label="筋力低下" tk="weakness_note" w="w-24" />

        {/* 運動機能障害 */}
        <div className="flex flex-wrap items-baseline gap-0.5 py-px">
          <BfCb c={c} id="motor" />
          <BfL>運動機能障害（</BfL>
          <BfCL c={c} id="motor_palsy" label="麻痺" />
          <BfL>　</BfL>
          <BfCL c={c} id="motor_involuntary" label="不随意運動" />
          <BfL>　</BfL>
          <BfCL c={c} id="motor_ataxia" label="運動失調" />
          <BfL>　</BfL>
          <BfCL c={c} id="motor_parkinsonism" label="パーキンソニズム" />
          <BfL>）</BfL>
        </div>

        <BfRow c={c} id="tone" label="筋緊張異常" tk="tone_note" w="w-24" />

        {/* 感覚機能障害 */}
        <div className="flex flex-wrap items-baseline gap-0.5 py-px">
          <BfCb c={c} id="sensory" />
          <BfL>感覚機能障害（</BfL>
          <BfCL c={c} id="sensory_hearing" label="聴覚" />
          <BfL>　</BfL>
          <BfCL c={c} id="sensory_vision" label="視覚" />
          <BfL>　</BfL>
          <BfCL c={c} id="sensory_superficial" label="表在覚" />
          <BfL>　</BfL>
          <BfCL c={c} id="sensory_deep" label="深部覚" />
          <BfL>）</BfL>
        </div>

        <BfRow c={c} id="speech" label="音声・発話機能障害" tk="speech_note" w="w-20" />

        {/* 高次脳機能障害 */}
        <div className="flex flex-wrap items-baseline gap-0.5 py-px">
          <BfCb c={c} id="higher_brain" />
          <BfL>高次脳機能障害（</BfL>
          <BfCL c={c} id="higher_memory" label="記憶" />
          <BfL>　</BfL>
          <BfCL c={c} id="higher_attention" label="注意" />
          <BfL>　</BfL>
          <BfCL c={c} id="higher_apraxia" label="失行" />
          <BfL>　</BfL>
          <BfCL c={c} id="higher_agnosia" label="失認" />
          <BfL>　</BfL>
          <BfCL c={c} id="higher_executive" label="遂行" />
          <BfL>）</BfL>
        </div>

        <BfRow c={c} id="psychiatric" label="精神行動障害" tk="psychiatric_note" w="w-24" />
        <BfRow c={c} id="disorientation" label="見当識障害" tk="disorientation_note" w="w-24" />
        <BfRow c={c} id="memory_disorder" label="記憶障害" tk="memory_disorder_note" w="w-24" />

        {/* 発達障害 */}
        <div className="space-y-px">
          <div className="flex flex-wrap items-baseline gap-0.5 py-px">
            <BfCb c={c} id="developmental" />
            <BfL>発達障害（</BfL>
            <BfCL c={c} id="dev_asd" label="自閉スペクトラム症" />
            <BfL>　</BfL>
            <BfCL c={c} id="dev_ld" label="学習障害" />
            <BfL>　</BfL>
            <BfCL c={c} id="dev_adhd" label="注意欠如多動性障害" />
            <BfL>）</BfL>
          </div>
          <div className="ml-3 flex items-baseline gap-0.5">
            <BfCL c={c} id="dev_other" label="その他（" />
            <BfTi c={c} id="dev_other_note" w="w-20" />
            <BfL>）</BfL>
          </div>
        </div>

        <BfRow c={c} id="dementia" label="認知症" tk="dementia_note" w="w-24" />
      </div>
    </div>
  );
}

// ── 基本動作テーブル ──────────────────────────────────────────

function BasicMovementTable({
  scores,
  onChange,
  readOnly,
}: {
  scores: Record<string, string>;
  onChange: (k: string, v: string) => void;
  readOnly: boolean;
}) {
  return (
    <table className="w-full table-fixed text-[12px] print:text-[7.5pt]">
      <colgroup>
        <col className="w-[42%]" />
        <col className="w-[14.5%]" />
        <col className="w-[14.5%]" />
        <col className="w-[14.5%]" />
        <col className="w-[14.5%]" />
      </colgroup>
      <thead>
        <tr className="border-b border-neutral-100">
          <th className="py-1 text-left font-medium text-neutral-400">項目</th>
          {BM_LEVELS.map((lv) => (
            <th key={lv} className="py-1 text-center text-[11px] font-medium text-neutral-400">
              {lv}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {BASIC_MOVEMENTS.map((item) => {
          const current = scores[item] ?? "";
          return (
            <tr key={item} className="border-b border-neutral-50 last:border-0">
              <td className="py-1.5 text-[12px] text-neutral-700">{item}</td>
              {BM_LEVELS.map((lv) => (
                <td key={lv} className="py-1.5 text-center">
                  {readOnly ? (
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 rounded-full border",
                        current === lv ? "border-indigo-500 bg-indigo-500" : "border-neutral-200"
                      )}
                    />
                  ) : (
                    <input
                      type="radio"
                      name={`bm_${item}`}
                      value={lv}
                      checked={current === lv}
                      onChange={() => onChange(item, lv)}
                      className="h-3.5 w-3.5 cursor-pointer accent-indigo-500"
                    />
                  )}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── FIM テーブル ──────────────────────────────────────────────

function FimTable({
  scores,
  onChange,
  readOnly,
}: {
  scores: Record<string, number | null>;
  onChange: (k: string, v: number | null) => void;
  readOnly: boolean;
}) {
  function sum(groups: { items: string[] }[]) {
    return groups
      .flatMap((g) => g.items)
      .reduce<number>((s, item) => {
        const v = scores[item];
        return s + (v != null && v >= 1 && v <= 7 ? v : 0);
      }, 0);
  }
  const motorTotal = sum(FIM_MOTOR);
  const cogTotal = sum(FIM_COGNITIVE);
  const total = motorTotal + cogTotal;

  const numInput = (item: string) => {
    const val = scores[item] ?? null;
    if (readOnly)
      return (
        <span className="text-[13px] font-semibold text-neutral-900 tabular-nums">
          {val ?? <span className="text-neutral-300">—</span>}
        </span>
      );
    return (
      <input
        type="number"
        min={1}
        max={7}
        value={val ?? ""}
        onChange={(e) => {
          const n = parseInt(e.target.value);
          onChange(item, isNaN(n) ? null : Math.min(7, Math.max(1, n)));
        }}
        placeholder="—"
        className="w-12 rounded border border-neutral-200 bg-white px-1 py-0.5 text-center text-[12px] text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
      />
    );
  };

  function GroupBlock({ group }: { group: { label: string; items: string[] } }) {
    return (
      <div>
        <p className="mb-0.5 text-[11px] font-semibold text-neutral-500 print:mb-0 print:text-[6.5pt]">
          {group.label}
        </p>
        <div className="space-y-px print:space-y-0">
          {group.items.map((item) => (
            <div key={item} className="flex items-center gap-1.5 print:gap-1">
              <span className="w-32 shrink-0 text-[11px] whitespace-nowrap text-neutral-600 print:w-28 print:text-[6.5pt]">
                {item}
              </span>
              {numInput(item)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 print:space-y-0.5">
      {/* 凡例 */}
      <div className="flex flex-wrap gap-x-3 gap-y-0 text-[10px] leading-none text-neutral-400 print:hidden print:text-[6.5pt]">
        {FIM_SCALE.map(({ score, label }) => (
          <span key={score}>
            <strong className="text-neutral-600">{score}</strong> {label}
          </span>
        ))}
      </div>
      {/* 運動 ｜ 認知 */}
      <div className="grid grid-cols-2 gap-x-5 print:gap-x-3">
        {/* 左：運動項目 */}
        <div className="space-y-2 print:space-y-0">
          <p className="text-[10px] font-bold tracking-wide text-neutral-400 uppercase">運動項目</p>
          {FIM_MOTOR.map((g) => (
            <GroupBlock key={g.label} group={g} />
          ))}
          <p className="border-t border-neutral-100 pt-1 text-right text-[11px]">
            <span className="text-neutral-400">運動小計 </span>
            <span className="font-bold text-neutral-700 tabular-nums">{motorTotal}</span>
            <span className="text-neutral-300"> / 91</span>
          </p>
        </div>
        {/* 右：認知項目 ＋ 合計 */}
        <div className="flex flex-col justify-between space-y-2 print:space-y-0">
          <div className="space-y-2 print:space-y-0">
            <p className="text-[10px] font-bold tracking-wide text-neutral-400 uppercase">
              認知項目
            </p>
            {FIM_COGNITIVE.map((g) => (
              <GroupBlock key={g.label} group={g} />
            ))}
            <p className="border-t border-neutral-100 pt-1 text-right text-[11px]">
              <span className="text-neutral-400">認知小計 </span>
              <span className="font-bold text-neutral-700 tabular-nums">{cogTotal}</span>
              <span className="text-neutral-300"> / 35</span>
            </p>
          </div>
          <div className="rounded-lg bg-neutral-50 px-3 py-2 text-right">
            <p className="text-[10px] text-neutral-400">FIM合計</p>
            <p className="text-xl leading-none font-bold text-neutral-900 tabular-nums">
              {total}
              <span className="text-[12px] font-normal text-neutral-400"> / 126点</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── デフォルト値 ──────────────────────────────────────────────

const blank: RehabDocumentFormData["content"] = {
  main_disability: "",
  long_term_goal: "",
  short_term_goal: "",
  goal_period: "1ヶ月",
  treatment_content: "",
  comorbidities: "",
  rest_risk: "",
  contraindications: "",
  body_function_checks: {},
  body_function_texts: {},
  basic_movement_scores: {},
  fim_scores: defaultFimScores(),
  assistive_devices: "",
  monthly_status: "",
  nutrition: "",
  oral: "",
  social_services: "",
  discharge_goal: "",
  treatment_policy: "",
  rehab_content: "",
  history_status: "",
  participation_goal: "",
  activity_goal: "",
  concrete_approach: "",
  family_info: "",
  home_environment: "",
  swallowing_status: "",
  swallowing_plan: "",
  guidance_content: "",
  service_coordination: "",
  discharge_notes: "",
  other_plan_notes: "",
  evaluation_date: "",
  pt_content: "",
  pt_frequency: "",
  ot_content: "",
  ot_frequency: "",
  st_content: "",
  st_frequency: "",
  precautions: "",
  doctor_name: "",
  consent_obtained: false,
  consent_date: "",
  medical_institution: "",
  rehab_doctor: "",
  attending_doctor: "",
  creator_pt: "",
  creator_ot: "",
  creator_st: "",
  creator_nurse: "",
  creator_sw: "",
  creator_dietitian: "",
  explanation_person: "",
  exercise_device_disease: "",
  exercise_device_onset: "",
  exercise_device_findings: "",
  exercise_device_plan_detail: "",
};

// ── メインコンポーネント ───────────────────────────────────────

export default function B21PlanForm({ tenantId, patient, document: doc, backHref }: Props) {
  "use no memo";

  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!doc);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const age = useMemo(() => calcAge(patient.birth_date), [patient.birth_date]);

  const { register, handleSubmit, watch, setValue } = useForm<RehabDocumentFormData>({
    resolver: zodResolver(rehabDocumentSchema) as Resolver<RehabDocumentFormData>,
    defaultValues: {
      patient_id: patient.id,
      document_date: doc?.document_date ?? format(new Date(), "yyyy-MM-dd"),
      valid_from: doc?.valid_from ?? "",
      valid_to: doc?.valid_to ?? "",
      content: {
        ...blank,
        ...(doc?.content ?? {}),
        body_function_checks: { ...(doc?.content?.body_function_checks ?? {}) },
        body_function_texts: { ...(doc?.content?.body_function_texts ?? {}) },
        basic_movement_scores: { ...(doc?.content?.basic_movement_scores ?? {}) },
        fim_scores: { ...defaultFimScores(), ...(doc?.content?.fim_scores ?? {}) },
      },
    },
  });

  const content = watch("content");
  const documentDate = watch("document_date");
  const validFrom = watch("valid_from");
  const validTo = watch("valid_to");

  function str(key: keyof typeof blank) {
    return {
      value: (content[key] as string) ?? "",
      onChange: (v: string) => setValue(`content.${key}`, v),
    };
  }

  const bfChecks = (content.body_function_checks ?? {}) as Record<string, boolean>;
  const bfTexts = (content.body_function_texts ?? {}) as Record<string, string>;
  const bmScores = (content.basic_movement_scores ?? {}) as Record<string, string>;
  const fimScores = (content.fim_scores ?? defaultFimScores()) as Record<string, number | null>;

  function setBf(id: string, v: boolean) {
    setValue("content.body_function_checks", { ...bfChecks, [id]: v });
  }
  function setBfText(id: string, v: string) {
    setValue("content.body_function_texts", { ...bfTexts, [id]: v });
  }
  function setBm(k: string, v: string) {
    setValue("content.basic_movement_scores", { ...bmScores, [k]: v });
  }
  function setFim(k: string, v: number | null) {
    setValue("content.fim_scores", { ...fimScores, [k]: v });
  }

  async function onSubmit(data: RehabDocumentFormData) {
    setIsSubmitting(true);
    const result = doc
      ? await updateRehabDocument(doc.id, tenantId, data)
      : await createRehabDocument(tenantId, data);
    setIsSubmitting(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(doc ? "書類を更新しました" : "書類を作成しました");
    if (doc) {
      setIsEditing(false);
      router.refresh();
    } else if (result && "id" in result)
      router.push(`/patients/${patient.id}/documents/${result.id}`);
  }

  async function onDelete() {
    if (!doc || !confirm("この書類を削除します。よろしいですか？")) return;
    setIsDeleting(true);
    const result = await deleteRehabDocument(doc.id, tenantId);
    setIsDeleting(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("書類を削除しました");
    router.push(backHref);
  }

  const ro = !isEditing;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col">
      {/* ツールバー */}
      <div className="no-print flex shrink-0 items-center justify-between gap-3 px-6 pt-5 pb-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full")}
          >
            <ChevronLeft size={15} />
            書類一覧
          </Link>
          <div>
            <h1 className="text-lg font-bold text-neutral-900">
              リハビリテーション実施計画書（総合実施計画書）
            </h1>
            <p className="text-xs text-neutral-400">
              {patient.name_kanji} / {patient.patient_code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {doc && ro && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => window.print()}
              >
                <Printer size={13} />
                印刷 / PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setIsEditing(true)}
              >
                <Pencil size={13} />
                編集
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive rounded-full"
                disabled={isDeleting}
                onClick={onDelete}
              >
                <Trash2 size={13} />
                削除
              </Button>
            </>
          )}
          {isEditing && (
            <>
              {doc && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setIsEditing(false)}
                >
                  キャンセル
                </Button>
              )}
              <Button type="submit" size="sm" disabled={isSubmitting} className="rounded-full">
                <Save size={13} />
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* フォーム本体 */}
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-8 print:overflow-visible print:px-0">
        <input type="hidden" {...register("patient_id")} />

        {/* ===== 1枚目 ===== */}
        <div className="mx-auto max-w-5xl space-y-6 rounded-xl bg-white p-6 shadow-sm print:max-w-none print:space-y-0 print:rounded-none print:p-0 print:shadow-none">
          {/* 書類メタ */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel>作成日</FieldLabel>
              {ro ? (
                <ReadValue value={fmtDate(documentDate)} />
              ) : (
                <input type="date" {...register("document_date")} className={inputCls} />
              )}
            </div>
            <div>
              <FieldLabel>有効期間（開始）</FieldLabel>
              {ro ? (
                <ReadValue value={fmtDate(validFrom)} />
              ) : (
                <input type="date" {...register("valid_from")} className={inputCls} />
              )}
            </div>
            <div>
              <FieldLabel>有効期間（終了）</FieldLabel>
              {ro ? (
                <ReadValue value={fmtDate(validTo)} />
              ) : (
                <input type="date" {...register("valid_to")} className={inputCls} />
              )}
            </div>
          </div>

          {/* 患者基本情報 */}
          <div className="space-y-2 print:space-y-0">
            <SectionHeader>患者基本情報</SectionHeader>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <FieldLabel>氏名</FieldLabel>
                <ReadValue value={`${patient.name_kanji}（${patient.name_kana}）`} />
              </div>
              <div>
                <FieldLabel>性別</FieldLabel>
                <ReadValue value={genderLabel[patient.gender]} />
              </div>
              <div>
                <FieldLabel>年齢</FieldLabel>
                <ReadValue value={`${age}歳`} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <FieldLabel>算定病名</FieldLabel>
                <ReadValue value={patient.main_diagnosis} />
              </div>
              <div>
                <FieldLabel>発症日・手術日</FieldLabel>
                <ReadValue value={fmtDate(patient.onset_date)} />
              </div>
              <div>
                <FieldLabel>リハ開始日</FieldLabel>
                <ReadValue value={fmtDate(patient.rehab_start_date)} />
              </div>
            </div>
          </div>

          {/* 治療内容・注意事項 */}
          <div className="space-y-3 print:space-y-0">
            <SectionHeader>治療内容・注意事項</SectionHeader>
            <div className="grid grid-cols-2 gap-3 print:gap-1">
              <div>
                <FieldLabel>治療内容</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("treatment_content")} />
              </div>
              <div>
                <FieldLabel>主障害</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("main_disability")} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 print:gap-1">
              <div>
                <FieldLabel>併存疾患</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("comorbidities")} />
              </div>
              <div>
                <FieldLabel>安静度・リスク</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("rest_risk")} />
              </div>
              <div>
                <FieldLabel>禁忌事項</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("contraindications")} />
              </div>
            </div>
          </div>

          {/* 心身機能・構造 */}
          <div className="space-y-2 print:space-y-0">
            <SectionHeader>
              心身機能・構造（該当する項目のみ記載すること。客観的評価も記載すること。）
            </SectionHeader>
            <BodyFunctionSection
              checks={bfChecks}
              texts={bfTexts}
              onCheck={setBf}
              onText={setBfText}
              readOnly={ro}
            />
          </div>

          {/* 基本動作 + FIM 横並び */}
          <div className="grid grid-cols-[1fr_1.5fr] items-start gap-6 print:gap-2">
            <div className="space-y-2 print:space-y-0">
              <SectionHeader>基本動作</SectionHeader>
              <BasicMovementTable scores={bmScores} onChange={setBm} readOnly={ro} />
            </div>
            <div className="space-y-2 print:space-y-0">
              <SectionHeader>ADL評価（FIM）</SectionHeader>
              <FimTable scores={fimScores} onChange={setFim} readOnly={ro} />
            </div>
          </div>

          {/* 補装具 */}
          <div>
            <FieldLabel>補装具・自助具</FieldLabel>
            <TextInput readOnly={ro} {...str("assistive_devices")} />
          </div>

          {/* 目標・治療方針 */}
          <div className="space-y-3 print:space-y-0">
            <SectionHeader>目標・治療方針</SectionHeader>
            <div className="grid grid-cols-2 gap-3 print:gap-1">
              <div>
                <FieldLabel>短期目標</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("short_term_goal")} />
                <div className="mt-1.5 flex items-center gap-2">
                  <FieldLabel>目標期間</FieldLabel>
                  <TextInput readOnly={ro} {...str("goal_period")} placeholder="例: 1ヶ月" />
                </div>
              </div>
              <div>
                <FieldLabel>長期目標</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("long_term_goal")} />
              </div>
            </div>
            <div>
              <FieldLabel>治療方針</FieldLabel>
              <TextArea readOnly={ro} rows={2} {...str("treatment_policy")} />
            </div>
          </div>

          {/* 実施内容（職種別） */}
          <div className="space-y-3 print:space-y-0">
            <SectionHeader>実施内容（職種別）</SectionHeader>
            <div className="grid grid-cols-3 gap-3 print:gap-1">
              {(
                [
                  { label: "PT（理学療法）", ck: "pt_content", fr: "pt_frequency" },
                  { label: "OT（作業療法）", ck: "ot_content", fr: "ot_frequency" },
                  { label: "ST（言語聴覚療法）", ck: "st_content", fr: "st_frequency" },
                ] as const
              ).map(({ label, ck, fr }) => (
                <div key={label} className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-neutral-500">{label}</p>
                  <div>
                    <FieldLabel>内容</FieldLabel>
                    <TextArea readOnly={ro} rows={2} {...str(ck)} />
                  </div>
                  <div>
                    <FieldLabel>頻度</FieldLabel>
                    <TextInput readOnly={ro} {...str(fr)} placeholder="例: 週3回" />
                  </div>
                </div>
              ))}
            </div>
            <div className="print:hidden">
              <FieldLabel>注意事項・特記</FieldLabel>
              <TextArea readOnly={ro} rows={2} {...str("precautions")} />
            </div>
          </div>

          <div className="print:hidden">
            <TextInput readOnly={ro} {...str("social_services")} />
          </div>
        </div>

        {/* ===== 2枚目 ===== */}
        <div className="page-break mx-auto mt-4 max-w-5xl space-y-6 rounded-xl bg-white p-6 shadow-sm print:mt-0 print:max-w-none print:space-y-1 print:rounded-none print:p-0 print:shadow-none">
          <p className="text-[11px] text-neutral-400 print:hidden">
            ▼ 2枚目（総合実施計画書）— H003-2を算定する場合のみ記入
          </p>

          <div className="space-y-2 print:space-y-0">
            <SectionHeader>リハビリ実施歴・現況</SectionHeader>
            <FieldLabel>経過・現在の状態</FieldLabel>
            <TextArea readOnly={ro} rows={2} {...str("history_status")} />
          </div>

          <div className="space-y-3 print:space-y-0">
            <SectionHeader>参加・活動目標</SectionHeader>
            <div className="grid grid-cols-2 gap-3 print:gap-1">
              <div>
                <FieldLabel>参加目標</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("participation_goal")} />
              </div>
              <div>
                <FieldLabel>活動目標</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("activity_goal")} />
              </div>
            </div>
            <div>
              <FieldLabel>具体的アプローチ</FieldLabel>
              <TextArea readOnly={ro} rows={2} {...str("concrete_approach")} />
            </div>
          </div>

          <div className="space-y-3 print:space-y-0">
            <SectionHeader>環境・家族情報</SectionHeader>
            <div className="grid grid-cols-2 gap-3 print:gap-1">
              <div>
                <FieldLabel>家族・介護者情報</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("family_info")} />
              </div>
              <div>
                <FieldLabel>住環境</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("home_environment")} />
              </div>
            </div>
          </div>

          <div className="space-y-3 print:space-y-0">
            <SectionHeader>嚥下機能</SectionHeader>
            <div className="grid grid-cols-2 gap-3 print:gap-1">
              <div>
                <FieldLabel>嚥下機能の状態</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("swallowing_status")} />
              </div>
              <div>
                <FieldLabel>嚥下リハ計画</FieldLabel>
                <TextArea readOnly={ro} rows={2} {...str("swallowing_plan")} />
              </div>
            </div>
          </div>

          <div className="space-y-3 print:space-y-0">
            <SectionHeader>指導・連携・退院</SectionHeader>
            <div>
              <FieldLabel>指導内容</FieldLabel>
              <TextArea readOnly={ro} rows={2} {...str("guidance_content")} />
            </div>
            <div>
              <FieldLabel>サービス調整・介護保険連携</FieldLabel>
              <TextArea readOnly={ro} rows={2} {...str("service_coordination")} />
            </div>
            <div>
              <FieldLabel>退院時注意事項・退院後生活</FieldLabel>
              <TextArea readOnly={ro} rows={2} {...str("discharge_notes")} />
            </div>
            <div>
              <FieldLabel>その他・備考</FieldLabel>
              <TextArea readOnly={ro} rows={2} {...str("other_plan_notes")} />
            </div>
          </div>

          {/* 運動量増加機器加算 */}
          <div className="space-y-2 print:space-y-0">
            <SectionHeader>運動量増加機器加算</SectionHeader>
            <label
              className={`flex items-center gap-2 text-[13px] text-neutral-900 ${!ro ? "cursor-pointer" : ""}`}
            >
              <input
                type="checkbox"
                checked={bfChecks["exercise_device"] ?? false}
                disabled={ro}
                onChange={(e) => !ro && setBf("exercise_device", e.target.checked)}
                className="h-4 w-4 rounded accent-indigo-500 disabled:cursor-default"
              />
              運動量増加機器加算を算定する（※算定する場合は以下を記入）
            </label>
            <div className="grid grid-cols-2 gap-3 print:gap-1">
              <div>
                <FieldLabel>適応疾患</FieldLabel>
                <TextInput readOnly={ro} {...str("exercise_device_disease")} />
              </div>
              <div>
                <FieldLabel>適応箇所</FieldLabel>
                <div className="flex items-center gap-4">
                  <label
                    className={`flex items-center gap-1 text-[13px] text-neutral-900 ${!ro ? "cursor-pointer" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={bfChecks["exercise_device_upper"] ?? false}
                      disabled={ro}
                      onChange={(e) => !ro && setBf("exercise_device_upper", e.target.checked)}
                      className="h-4 w-4 rounded accent-indigo-500 disabled:cursor-default"
                    />
                    上肢
                  </label>
                  <label
                    className={`flex items-center gap-1 text-[13px] text-neutral-900 ${!ro ? "cursor-pointer" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={bfChecks["exercise_device_lower"] ?? false}
                      disabled={ro}
                      onChange={(e) => !ro && setBf("exercise_device_lower", e.target.checked)}
                      className="h-4 w-4 rounded accent-indigo-500 disabled:cursor-default"
                    />
                    下肢
                  </label>
                </div>
              </div>
            </div>
            <div>
              <FieldLabel>発症年月日</FieldLabel>
              {ro ? (
                <ReadValue value={fmtDate(content.exercise_device_onset)} />
              ) : (
                <input
                  type="date"
                  value={content.exercise_device_onset ?? ""}
                  onChange={(e) => setValue("content.exercise_device_onset", e.target.value)}
                  className={cn(inputCls, "max-w-xs")}
                />
              )}
            </div>
            <div>
              <FieldLabel>運動障害に関する所見</FieldLabel>
              <TextArea readOnly={ro} rows={2} {...str("exercise_device_findings")} />
            </div>
            <div>
              <FieldLabel>使用する機器の名称及び実施期間の予定</FieldLabel>
              <TextArea readOnly={ro} rows={2} {...str("exercise_device_plan_detail")} />
            </div>
          </div>

          <div>
            <SectionHeader>評価日</SectionHeader>
            <div className="mt-2 max-w-xs">
              <FieldLabel>計画評価実施日</FieldLabel>
              {ro ? (
                <ReadValue value={fmtDate(content.evaluation_date)} />
              ) : (
                <input
                  type="date"
                  value={content.evaluation_date ?? ""}
                  onChange={(e) => setValue("content.evaluation_date", e.target.value)}
                  className={inputCls}
                />
              )}
            </div>
          </div>

          {/* 作成医療機関及び担当者（フォーム最末尾） */}
          <div className="space-y-2 print:space-y-0">
            <SectionHeader>作成医療機関及び担当者</SectionHeader>
            <div>
              <FieldLabel>医療機関名称（連絡先等）</FieldLabel>
              <TextInput readOnly={ro} {...str("medical_institution")} />
            </div>
            <div className="grid grid-cols-2 gap-3 print:gap-1">
              <div>
                <FieldLabel>リハビリテーション科医</FieldLabel>
                <TextInput readOnly={ro} {...str("rehab_doctor")} />
              </div>
              <div>
                <FieldLabel>主治医</FieldLabel>
                <TextInput readOnly={ro} {...str("attending_doctor")} />
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2 print:gap-1">
              <div>
                <FieldLabel>理学療法士</FieldLabel>
                <TextInput readOnly={ro} {...str("creator_pt")} />
              </div>
              <div>
                <FieldLabel>作業療法士</FieldLabel>
                <TextInput readOnly={ro} {...str("creator_ot")} />
              </div>
              <div>
                <FieldLabel>言語聴覚士</FieldLabel>
                <TextInput readOnly={ro} {...str("creator_st")} />
              </div>
              <div>
                <FieldLabel>看護師</FieldLabel>
                <TextInput readOnly={ro} {...str("creator_nurse")} />
              </div>
              <div>
                <FieldLabel>社会福祉士</FieldLabel>
                <TextInput readOnly={ro} {...str("creator_sw")} />
              </div>
              <div>
                <FieldLabel>管理栄養士</FieldLabel>
                <TextInput readOnly={ro} {...str("creator_dietitian")} />
              </div>
            </div>
            {/* 説明日・説明者・同意 を3列で並べる */}
            <div className="grid grid-cols-3 gap-3 print:gap-1">
              <div>
                <FieldLabel>説明日</FieldLabel>
                {ro ? (
                  <ReadValue value={fmtDate(content.consent_date)} />
                ) : (
                  <input
                    type="date"
                    value={content.consent_date ?? ""}
                    onChange={(e) => setValue("content.consent_date", e.target.value)}
                    className={inputCls}
                  />
                )}
              </div>
              <div>
                <FieldLabel>説明者</FieldLabel>
                <TextInput readOnly={ro} {...str("explanation_person")} />
              </div>
              <div>
                <FieldLabel>患者・家族への説明同意</FieldLabel>
                {ro ? (
                  <ReadValue value={content.consent_obtained ? "✓ 同意済み" : "□ 未同意"} />
                ) : (
                  <label className="flex cursor-pointer items-center gap-2 pt-0.5 text-[13px] text-neutral-900">
                    <input
                      type="checkbox"
                      checked={content.consent_obtained ?? false}
                      onChange={(e) => setValue("content.consent_obtained", e.target.checked)}
                      className="h-4 w-4 rounded accent-indigo-500"
                    />
                    同意を得た
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
