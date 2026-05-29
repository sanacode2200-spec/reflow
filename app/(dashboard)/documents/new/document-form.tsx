"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import { createRehabDocument } from "@/lib/actions/rehab-document";
import { rehabDocumentSchema, type RehabDocumentFormData } from "@/lib/validators/rehab-document";
import type { PatientRow } from "@/lib/actions/patient";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  tenantId: string;
  patients: PatientRow[];
  defaultPatientId?: string;
};

const textareaClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-[80px] w-full rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-3 resize-none";
const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border bg-transparent px-3 text-sm transition-colors outline-none focus-visible:ring-3";
const inputClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border bg-transparent px-3 text-sm transition-colors outline-none focus-visible:ring-3";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-foreground border-border mb-4 border-b pb-2 text-sm font-semibold">
      {children}
    </h3>
  );
}

export default function DocumentForm({ tenantId, patients, defaultPatientId }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RehabDocumentFormData>({
    resolver: zodResolver(rehabDocumentSchema) as Resolver<RehabDocumentFormData>,
    defaultValues: {
      patient_id: defaultPatientId ?? "",
      document_date: format(new Date(), "yyyy-MM-dd"),
      valid_from: "",
      valid_to: "",
      content: {
        main_disability: "",
        long_term_goal: "",
        short_term_goal: "",
        goal_period: "3ヶ月",
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
      },
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;
  const selectedPatientId = watch("patient_id");
  const consentObtained = watch("content.consent_obtained");

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;
  const hasPt = !!selectedPatient?.pt_therapist_id;
  const hasOt = !!selectedPatient?.ot_therapist_id;
  const hasSt = !!selectedPatient?.st_therapist_id;

  const onSubmit = async (data: RehabDocumentFormData) => {
    setIsSubmitting(true);
    const result = await createRehabDocument(tenantId, data);
    setIsSubmitting(false);

    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("計画書を作成しました");
    router.push("/documents");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/documents"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full")}
        >
          <ChevronLeft size={15} />
          一覧に戻る
        </Link>
      </div>

      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          総合実施計画書 — 新規作成
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          リハビリテーション総合実施計画書（様式23 / 様式21の6）
        </p>
      </div>

      {/* 基本情報 */}
      <section className="glass-card p-5">
        <SectionTitle>基本情報</SectionTitle>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="patient_id">
              患者 <span className="text-destructive">*</span>
            </Label>
            <select id="patient_id" {...register("patient_id")} className={selectClass}>
              <option value="">患者を選択してください</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patient_code} — {p.name_kanji}（{p.name_kana}）
                </option>
              ))}
            </select>
            {errors.patient_id && (
              <p className="text-destructive text-xs">{errors.patient_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="document_date">
                計画書作成日 <span className="text-destructive">*</span>
              </Label>
              <input
                id="document_date"
                type="date"
                {...register("document_date")}
                className={inputClass}
              />
              {errors.document_date && (
                <p className="text-destructive text-xs">{errors.document_date.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="valid_from">計画期間 開始</Label>
              <input
                id="valid_from"
                type="date"
                {...register("valid_from")}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valid_to">計画期間 終了</Label>
              <input id="valid_to" type="date" {...register("valid_to")} className={inputClass} />
            </div>
          </div>

          {selectedPatient && (
            <div className="bg-muted/40 rounded-lg p-3 text-xs">
              <p>
                <span className="text-muted-foreground">病名:</span>{" "}
                <span className="text-foreground">{selectedPatient.main_diagnosis}</span>
              </p>
              <p className="mt-0.5">
                <span className="text-muted-foreground">リハビリ開始日:</span>{" "}
                <span className="text-foreground">{selectedPatient.rehab_start_date}</span>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 障害・疾患 */}
      <section className="glass-card p-5">
        <SectionTitle>障害・疾患</SectionTitle>
        <div className="space-y-1.5">
          <Label htmlFor="content.main_disability">
            主たる障害 <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="content.main_disability"
            {...register("content.main_disability")}
            placeholder="例: 右片麻痺、失語症"
            className={textareaClass}
            rows={2}
          />
          {errors.content?.main_disability && (
            <p className="text-destructive text-xs">{errors.content.main_disability.message}</p>
          )}
        </div>
      </section>

      {/* 目標 */}
      <section className="glass-card p-5">
        <SectionTitle>リハビリ目標</SectionTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_140px] gap-4">
            <div className="space-y-1.5">
              <Label>
                長期目標 <span className="text-destructive">*</span>
              </Label>
              <textarea
                {...register("content.long_term_goal")}
                placeholder="例: 屋外歩行自立、ADL自立"
                className={textareaClass}
                rows={2}
              />
              {errors.content?.long_term_goal && (
                <p className="text-destructive text-xs">{errors.content.long_term_goal.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-4">
            <div className="space-y-1.5">
              <Label>
                短期目標 <span className="text-destructive">*</span>
              </Label>
              <textarea
                {...register("content.short_term_goal")}
                placeholder="例: 平行棒内歩行練習、更衣動作の改善"
                className={textareaClass}
                rows={2}
              />
              {errors.content?.short_term_goal && (
                <p className="text-destructive text-xs">{errors.content.short_term_goal.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                達成期間 <span className="text-destructive">*</span>
              </Label>
              <input
                type="text"
                {...register("content.goal_period")}
                placeholder="例: 3ヶ月"
                className={inputClass}
              />
              {errors.content?.goal_period && (
                <p className="text-destructive text-xs">{errors.content.goal_period.message}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 職種別実施内容 */}
      <section className="glass-card p-5">
        <SectionTitle>職種別実施内容</SectionTitle>
        {!selectedPatientId && (
          <p className="text-muted-foreground text-sm">
            患者を選択すると担当職種の入力欄が表示されます
          </p>
        )}
        {selectedPatientId && !hasPt && !hasOt && !hasSt && (
          <p className="text-muted-foreground text-sm">担当療法士が設定されていません</p>
        )}

        <div className="space-y-5">
          {hasPt && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                  PT
                </span>
                <span className="text-foreground text-sm font-medium">理学療法</span>
              </div>
              <div className="grid grid-cols-[1fr_160px] gap-3">
                <div className="space-y-1.5">
                  <Label>実施内容</Label>
                  <textarea
                    {...register("content.pt_content")}
                    placeholder="例: 歩行練習、関節可動域訓練、筋力強化"
                    className={textareaClass}
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>頻度・時間</Label>
                  <input
                    type="text"
                    {...register("content.pt_frequency")}
                    placeholder="例: 週3回 40分"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {hasOt && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-700">
                  OT
                </span>
                <span className="text-foreground text-sm font-medium">作業療法</span>
              </div>
              <div className="grid grid-cols-[1fr_160px] gap-3">
                <div className="space-y-1.5">
                  <Label>実施内容</Label>
                  <textarea
                    {...register("content.ot_content")}
                    placeholder="例: ADL訓練、上肢機能訓練"
                    className={textareaClass}
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>頻度・時間</Label>
                  <input
                    type="text"
                    {...register("content.ot_frequency")}
                    placeholder="例: 週2回 40分"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {hasSt && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[11px] font-medium text-purple-700">
                  ST
                </span>
                <span className="text-foreground text-sm font-medium">言語聴覚療法</span>
              </div>
              <div className="grid grid-cols-[1fr_160px] gap-3">
                <div className="space-y-1.5">
                  <Label>実施内容</Label>
                  <textarea
                    {...register("content.st_content")}
                    placeholder="例: 摂食嚥下訓練、言語訓練"
                    className={textareaClass}
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>頻度・時間</Label>
                  <input
                    type="text"
                    {...register("content.st_frequency")}
                    placeholder="例: 週2回 20分"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 留意事項・その他 */}
      <section className="glass-card p-5">
        <SectionTitle>留意事項・その他</SectionTitle>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>留意事項 / リスク管理</Label>
            <textarea
              {...register("content.precautions")}
              placeholder="例: 転倒リスクに注意。血圧140以上の場合は中止。"
              className={textareaClass}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>指示医師名</Label>
            <input
              type="text"
              {...register("content.doctor_name")}
              placeholder="例: 山田 太郎"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* 説明・同意 */}
      <section className="glass-card p-5">
        <SectionTitle>患者・家族への説明・同意</SectionTitle>
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              {...register("content.consent_obtained")}
              className="accent-primary h-4 w-4 rounded"
            />
            <span className="text-foreground text-sm">
              患者・家族に計画書の内容を説明し、同意を得た
            </span>
          </label>

          {consentObtained && (
            <div className="space-y-1.5">
              <Label>同意取得日</Label>
              <input
                type="date"
                {...register("content.consent_date")}
                className={inputClass}
                style={{ maxWidth: "200px" }}
              />
            </div>
          )}
        </div>
      </section>

      {/* Submit */}
      <div className="flex justify-end gap-3 pb-8">
        <Link
          href="/documents"
          className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
        >
          キャンセル
        </Link>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full shadow-[0_8px_18px_rgba(99,102,241,0.28)]"
        >
          <Save size={15} />
          {isSubmitting ? "保存中..." : "計画書を保存"}
        </Button>
      </div>
    </form>
  );
}
