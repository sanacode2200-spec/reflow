"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Save, Pencil } from "lucide-react";
import Link from "next/link";
import { updateRehabDocument } from "@/lib/actions/rehab-document";
import { rehabDocumentSchema, type RehabDocumentFormData } from "@/lib/validators/rehab-document";
import type { RehabDocumentRow } from "@/lib/db/schema/rehab-documents";
import type { PatientRow } from "@/lib/actions/patient";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  tenantId: string;
  document: RehabDocumentRow;
  patients: PatientRow[];
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

export default function DocumentEditClient({ tenantId, document: doc, patients }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const content = doc.content;

  const form = useForm<RehabDocumentFormData>({
    resolver: zodResolver(rehabDocumentSchema) as Resolver<RehabDocumentFormData>,
    defaultValues: {
      patient_id: doc.patient_id,
      document_date: doc.document_date,
      valid_from: doc.valid_from ?? "",
      valid_to: doc.valid_to ?? "",
      content: {
        main_disability: content?.main_disability ?? "",
        long_term_goal: content?.long_term_goal ?? "",
        short_term_goal: content?.short_term_goal ?? "",
        goal_period: content?.goal_period ?? "3ヶ月",
        pt_content: content?.pt_content ?? "",
        pt_frequency: content?.pt_frequency ?? "",
        ot_content: content?.ot_content ?? "",
        ot_frequency: content?.ot_frequency ?? "",
        st_content: content?.st_content ?? "",
        st_frequency: content?.st_frequency ?? "",
        precautions: content?.precautions ?? "",
        doctor_name: content?.doctor_name ?? "",
        consent_obtained: content?.consent_obtained ?? false,
        consent_date: content?.consent_date ?? "",
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
    const result = await updateRehabDocument(doc.id, tenantId, data);
    setIsSubmitting(false);

    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("計画書を更新しました");
    setIsEditing(false);
    router.refresh();
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

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">総合実施計画書</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            リハビリテーション総合実施計画書（様式23 / 様式21の6）
          </p>
        </div>
        {!isEditing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setIsEditing(true)}
          >
            <Pencil size={13} />
            編集する
          </Button>
        )}
      </div>

      {/* 基本情報 */}
      <section className="glass-card p-5">
        <SectionTitle>基本情報</SectionTitle>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="patient_id">患者</Label>
            {isEditing ? (
              <>
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
              </>
            ) : (
              <p className="text-foreground text-sm">
                {patients.find((p) => p.id === doc.patient_id)?.name_kanji ?? "—"}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>計画書作成日</Label>
              {isEditing ? (
                <input type="date" {...register("document_date")} className={inputClass} />
              ) : (
                <p className="text-foreground text-sm">{doc.document_date}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>計画期間 開始</Label>
              {isEditing ? (
                <input type="date" {...register("valid_from")} className={inputClass} />
              ) : (
                <p className="text-foreground text-sm">{doc.valid_from ?? "—"}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>計画期間 終了</Label>
              {isEditing ? (
                <input type="date" {...register("valid_to")} className={inputClass} />
              ) : (
                <p className="text-foreground text-sm">{doc.valid_to ?? "—"}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 障害・疾患 */}
      <section className="glass-card p-5">
        <SectionTitle>障害・疾患</SectionTitle>
        <div className="space-y-1.5">
          <Label>主たる障害</Label>
          {isEditing ? (
            <>
              <textarea
                {...register("content.main_disability")}
                className={textareaClass}
                rows={2}
              />
              {errors.content?.main_disability && (
                <p className="text-destructive text-xs">{errors.content.main_disability.message}</p>
              )}
            </>
          ) : (
            <p className="text-foreground text-sm whitespace-pre-wrap">
              {content?.main_disability ?? "—"}
            </p>
          )}
        </div>
      </section>

      {/* 目標 */}
      <section className="glass-card p-5">
        <SectionTitle>リハビリ目標</SectionTitle>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>長期目標</Label>
            {isEditing ? (
              <>
                <textarea
                  {...register("content.long_term_goal")}
                  className={textareaClass}
                  rows={2}
                />
                {errors.content?.long_term_goal && (
                  <p className="text-destructive text-xs">
                    {errors.content.long_term_goal.message}
                  </p>
                )}
              </>
            ) : (
              <p className="text-foreground text-sm whitespace-pre-wrap">
                {content?.long_term_goal ?? "—"}
              </p>
            )}
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-4">
            <div className="space-y-1.5">
              <Label>短期目標</Label>
              {isEditing ? (
                <>
                  <textarea
                    {...register("content.short_term_goal")}
                    className={textareaClass}
                    rows={2}
                  />
                  {errors.content?.short_term_goal && (
                    <p className="text-destructive text-xs">
                      {errors.content.short_term_goal.message}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-foreground text-sm whitespace-pre-wrap">
                  {content?.short_term_goal ?? "—"}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>達成期間</Label>
              {isEditing ? (
                <>
                  <input type="text" {...register("content.goal_period")} className={inputClass} />
                  {errors.content?.goal_period && (
                    <p className="text-destructive text-xs">{errors.content.goal_period.message}</p>
                  )}
                </>
              ) : (
                <p className="text-foreground text-sm">{content?.goal_period ?? "—"}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 職種別実施内容 */}
      <section className="glass-card p-5">
        <SectionTitle>職種別実施内容</SectionTitle>
        <div className="space-y-5">
          {(hasPt || content?.pt_content) && (
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
                  {isEditing ? (
                    <textarea
                      {...register("content.pt_content")}
                      className={textareaClass}
                      rows={2}
                    />
                  ) : (
                    <p className="text-foreground text-sm whitespace-pre-wrap">
                      {content?.pt_content || "—"}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>頻度・時間</Label>
                  {isEditing ? (
                    <input
                      type="text"
                      {...register("content.pt_frequency")}
                      className={inputClass}
                    />
                  ) : (
                    <p className="text-foreground text-sm">{content?.pt_frequency || "—"}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {(hasOt || content?.ot_content) && (
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
                  {isEditing ? (
                    <textarea
                      {...register("content.ot_content")}
                      className={textareaClass}
                      rows={2}
                    />
                  ) : (
                    <p className="text-foreground text-sm whitespace-pre-wrap">
                      {content?.ot_content || "—"}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>頻度・時間</Label>
                  {isEditing ? (
                    <input
                      type="text"
                      {...register("content.ot_frequency")}
                      className={inputClass}
                    />
                  ) : (
                    <p className="text-foreground text-sm">{content?.ot_frequency || "—"}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {(hasSt || content?.st_content) && (
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
                  {isEditing ? (
                    <textarea
                      {...register("content.st_content")}
                      className={textareaClass}
                      rows={2}
                    />
                  ) : (
                    <p className="text-foreground text-sm whitespace-pre-wrap">
                      {content?.st_content || "—"}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>頻度・時間</Label>
                  {isEditing ? (
                    <input
                      type="text"
                      {...register("content.st_frequency")}
                      className={inputClass}
                    />
                  ) : (
                    <p className="text-foreground text-sm">{content?.st_frequency || "—"}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!hasPt &&
            !hasOt &&
            !hasSt &&
            !content?.pt_content &&
            !content?.ot_content &&
            !content?.st_content && (
              <p className="text-muted-foreground text-sm">実施内容の記録がありません</p>
            )}
        </div>
      </section>

      {/* 留意事項・その他 */}
      <section className="glass-card p-5">
        <SectionTitle>留意事項・その他</SectionTitle>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>留意事項 / リスク管理</Label>
            {isEditing ? (
              <textarea {...register("content.precautions")} className={textareaClass} rows={2} />
            ) : (
              <p className="text-foreground text-sm whitespace-pre-wrap">
                {content?.precautions || "—"}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>指示医師名</Label>
            {isEditing ? (
              <input
                type="text"
                {...register("content.doctor_name")}
                className={inputClass}
                style={{ maxWidth: "240px" }}
              />
            ) : (
              <p className="text-foreground text-sm">{content?.doctor_name || "—"}</p>
            )}
          </div>
        </div>
      </section>

      {/* 説明・同意 */}
      <section className="glass-card p-5">
        <SectionTitle>患者・家族への説明・同意</SectionTitle>
        {isEditing ? (
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
        ) : (
          <div className="space-y-1.5">
            <p className="text-foreground text-sm">
              {content?.consent_obtained ? "✓ 説明・同意済み" : "未確認"}
            </p>
            {content?.consent_date && (
              <p className="text-muted-foreground text-xs">同意日: {content.consent_date}</p>
            )}
          </div>
        )}
      </section>

      {/* Submit */}
      {isEditing && (
        <div className="flex justify-end gap-3 pb-8">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => setIsEditing(false)}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full shadow-[0_8px_18px_rgba(99,102,241,0.28)]"
          >
            <Save size={15} />
            {isSubmitting ? "保存中..." : "変更を保存"}
          </Button>
        </div>
      )}
    </form>
  );
}
