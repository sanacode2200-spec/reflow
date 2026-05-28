"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePatient, type PatientRow, type PatientFormData } from "@/lib/actions/patient";
import { checkAdditions } from "@/lib/rehab/additions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, CheckCircle } from "lucide-react";
import {
  DISEASE_OPTIONS,
  INSURANCE_OPTIONS,
  ONSET_TYPE_OPTIONS,
  patientFormSchema,
  type PatientForm as Form,
} from "@/lib/validators/patient";

type Staff = { id: string; name: string; occupation: string };
const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm transition-colors outline-none focus:ring-3 focus:ring-ring/50";

export default function PatientEditModal({
  patient,
  tenantId,
  staffs,
}: {
  patient: PatientRow;
  tenantId: string;
  staffs: Staff[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<Form>({
    resolver: zodResolver(patientFormSchema) as Resolver<Form>,
    defaultValues: {
      patient_code: patient.patient_code,
      name_kanji: patient.name_kanji,
      name_kana: patient.name_kana,
      birth_date: patient.birth_date,
      gender: patient.gender,
      patient_type: patient.patient_type,
      insurance_type: patient.insurance_type,
      main_diagnosis: patient.main_diagnosis,
      disease_category: patient.disease_category,
      facility_grade: patient.facility_grade,
      rehab_start_date: patient.rehab_start_date,
      onset_date: patient.onset_date,
      onset_type: patient.onset_type,
      pt_therapist_id: patient.pt_therapist_id ?? "",
      ot_therapist_id: patient.ot_therapist_id ?? "",
      st_therapist_id: patient.st_therapist_id ?? "",
      is_nursing_care: patient.is_nursing_care,
      medical_history: patient.medical_history ?? "",
    },
  });

  const watchedOnset = useWatch({ control: form.control, name: "onset_date" });
  const watchedRehab = useWatch({ control: form.control, name: "rehab_start_date" });
  const patientType = useWatch({ control: form.control, name: "patient_type" });
  const therapistIds = useWatch({
    control: form.control,
    name: ["pt_therapist_id", "ot_therapist_id", "st_therapist_id"],
  });
  const alert = watchedOnset && watchedRehab ? checkAdditions(watchedOnset, watchedRehab) : null;

  const handleSubmit = async (data: Form) => {
    setServerError(null);
    try {
      await updatePatient(patient.id, tenantId, data as PatientFormData);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "エラーが発生しました");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5"
      >
        <Pencil size={13} />
        編集
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>患者情報の編集</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>患者ID</Label>
                <Input {...form.register("patient_code")} />
              </div>
              <div className="space-y-1.5">
                <Label>生年月日</Label>
                <Input {...form.register("birth_date")} type="date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>氏名（漢字）</Label>
                <Input {...form.register("name_kanji")} />
              </div>
              <div className="space-y-1.5">
                <Label>氏名（カナ）</Label>
                <Input {...form.register("name_kana")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>入院 / 外来</Label>
              <div className="flex gap-2">
                {[
                  { value: "outpatient", label: "外来通院" },
                  { value: "inpatient", label: "入院中" },
                ].map((o) => {
                  const selected = patientType === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() =>
                        form.setValue("patient_type", o.value as "inpatient" | "outpatient")
                      }
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>性別</Label>
                <select {...form.register("gender")} className={selectClass}>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>保険種別</Label>
                <select {...form.register("insurance_type")} className={selectClass}>
                  {INSURANCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>主病名</Label>
              <Input {...form.register("main_diagnosis")} />
            </div>
            <div className="space-y-1.5">
              <Label>疾患別区分</Label>
              <select {...form.register("disease_category")} className={selectClass}>
                {DISEASE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>リハビリ開始日</Label>
                <Input {...form.register("rehab_start_date")} type="date" />
              </div>
              <div className="space-y-1.5">
                <Label>起算日の種別</Label>
                <select {...form.register("onset_type")} className={selectClass}>
                  {ONSET_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>起算日</Label>
              <Input {...form.register("onset_date")} type="date" />
            </div>
            {alert && (alert.initial || alert.early) && (
              <div className="space-y-1">
                {alert.initial && (
                  <div className="bg-primary/10 text-primary flex items-center gap-2 rounded px-3 py-2 text-xs">
                    <CheckCircle size={12} />
                    <strong>初期加算対象</strong>
                  </div>
                )}
                {alert.early && (
                  <div className="flex items-center gap-2 rounded bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-300">
                    <CheckCircle size={12} />
                    <strong>早期加算対象</strong>
                  </div>
                )}
              </div>
            )}
            <div className="border-border space-y-3 rounded-lg border p-4">
              <p className="text-foreground text-sm font-medium">
                主担当
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                  （1人以上必須）
                </span>
              </p>
              {(["pt", "ot", "st"] as const).map((occ, index) => {
                const field = `${occ}_therapist_id` as
                  | "pt_therapist_id"
                  | "ot_therapist_id"
                  | "st_therapist_id";
                const filtered = staffs.filter((s) => s.occupation === occ);
                const err =
                  occ === "pt" ? form.formState.errors.pt_therapist_id?.message : undefined;
                return (
                  <div key={occ} className="space-y-1.5">
                    <label className="text-muted-foreground text-sm">
                      <span className="text-[10px] font-bold tracking-wide uppercase">
                        {occ.toUpperCase()}
                      </span>{" "}
                      主担当
                    </label>
                    <select
                      value={therapistIds[index] ?? ""}
                      onChange={(e) =>
                        form.setValue(field, e.target.value, { shouldValidate: true })
                      }
                      className={selectClass}
                    >
                      <option value="">— なし —</option>
                      {filtered.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {err && <p className="text-destructive text-xs">{err}</p>}
                  </div>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <Label>既往歴・注意事項</Label>
              <textarea
                {...form.register("medical_history")}
                rows={3}
                className="border-input focus:ring-ring/50 w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-3"
              />
            </div>
            <div className="flex items-center gap-2">
              <input {...form.register("is_nursing_care")} id="edit-nursing" type="checkbox" />
              <label htmlFor="edit-nursing" className="text-muted-foreground text-sm">
                要介護被保険者
              </label>
            </div>
            {serverError && (
              <p className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
                {serverError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
