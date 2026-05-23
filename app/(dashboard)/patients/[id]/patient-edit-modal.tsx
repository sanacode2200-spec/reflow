"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const optTherapistId = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().uuid().nullable().optional()
);

const schema = z
  .object({
    patient_code: z.string().min(1),
    name_kanji: z.string().min(1),
    name_kana: z.string().min(1),
    birth_date: z.string().min(1),
    gender: z.enum(["male", "female", "other"]),
    patient_type: z.enum(["inpatient", "outpatient"]),
    insurance_type: z.enum(["medical", "workers_comp", "auto_liability"]),
    main_diagnosis: z.string().min(1),
    disease_category: z.enum([
      "cerebrovascular",
      "musculoskeletal",
      "disuse_syndrome",
      "cardiovascular",
      "respiratory",
    ]),
    facility_grade: z.enum(["grade_1", "grade_2", "grade_3"]),
    rehab_start_date: z.string().min(1),
    onset_date: z.string().min(1),
    onset_type: z.enum(["onset", "surgery", "acute_exacerbation"]),
    pt_therapist_id: optTherapistId,
    ot_therapist_id: optTherapistId,
    st_therapist_id: optTherapistId,
    is_nursing_care: z.boolean(),
    medical_history: z.string().optional(),
  })
  .refine((d) => d.pt_therapist_id || d.ot_therapist_id || d.st_therapist_id, {
    message: "いずれか1人以上選択してください",
    path: ["pt_therapist_id"],
  });

type Form = z.infer<typeof schema>;
type Staff = { id: string; name: string; occupation: string };
const DISEASE_OPTIONS = [
  { value: "cerebrovascular", label: "脳血管疾患等" },
  { value: "musculoskeletal", label: "運動器" },
  { value: "disuse_syndrome", label: "廃用症候群" },
  { value: "cardiovascular", label: "心大血管" },
  { value: "respiratory", label: "呼吸器" },
];
const INSURANCE_OPTIONS = [
  { value: "medical", label: "医療保険" },
  { value: "workers_comp", label: "労災保険" },
  { value: "auto_liability", label: "自賠責保険" },
];
const ONSET_TYPE_OPTIONS = [
  { value: "onset", label: "発症日" },
  { value: "surgery", label: "手術日" },
  { value: "acute_exacerbation", label: "急性増悪日" },
];

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
    resolver: zodResolver(schema) as Resolver<Form>,
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

  const watchedOnset = form.watch("onset_date");
  const watchedRehab = form.watch("rehab_start_date");
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
                  const selected = form.watch("patient_type") === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() =>
                        form.setValue("patient_type", o.value as "inpatient" | "outpatient")
                      }
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${selected ? "border-[#111] bg-[#111] text-white" : "border-[#eaeaea] bg-white text-[#888] hover:border-[#111]"}`}
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
                <select
                  {...form.register("gender")}
                  className="w-full rounded-md border border-[#eaeaea] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#111] focus:outline-none"
                >
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>保険種別</Label>
                <select
                  {...form.register("insurance_type")}
                  className="w-full rounded-md border border-[#eaeaea] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#111] focus:outline-none"
                >
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
              <select
                {...form.register("disease_category")}
                className="w-full rounded-md border border-[#eaeaea] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#111] focus:outline-none"
              >
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
                <select
                  {...form.register("onset_type")}
                  className="w-full rounded-md border border-[#eaeaea] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#111] focus:outline-none"
                >
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
                  <div className="flex items-center gap-2 rounded bg-[#f0f7ff] px-3 py-2 text-xs text-[#0070f3]">
                    <CheckCircle size={12} />
                    <strong>初期加算対象</strong>
                  </div>
                )}
                {alert.early && (
                  <div className="flex items-center gap-2 rounded bg-[#f0fdf4] px-3 py-2 text-xs text-green-700">
                    <CheckCircle size={12} />
                    <strong>早期加算対象</strong>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-3 rounded-lg border border-[#eaeaea] p-4">
              <p className="text-sm font-medium text-[#111]">
                主担当
                <span className="ml-1.5 text-xs font-normal text-[#888]">（1人以上必須）</span>
              </p>
              {(["pt", "ot", "st"] as const).map((occ) => {
                const field = `${occ}_therapist_id` as
                  | "pt_therapist_id"
                  | "ot_therapist_id"
                  | "st_therapist_id";
                const filtered = staffs.filter((s) => s.occupation === occ);
                const err =
                  occ === "pt" ? form.formState.errors.pt_therapist_id?.message : undefined;
                return (
                  <div key={occ} className="space-y-1.5">
                    <label className="text-sm text-[#888]">
                      <span className="text-[10px] font-bold tracking-wide uppercase">
                        {occ.toUpperCase()}
                      </span>{" "}
                      主担当
                    </label>
                    <select
                      value={form.watch(field) ?? ""}
                      onChange={(e) =>
                        form.setValue(field, e.target.value, { shouldValidate: true })
                      }
                      className="w-full rounded-md border border-[#eaeaea] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#111] focus:outline-none"
                    >
                      <option value="">— なし —</option>
                      {filtered.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {err && <p className="text-xs text-red-500">{err}</p>}
                  </div>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <Label>既往歴・注意事項</Label>
              <textarea
                {...form.register("medical_history")}
                rows={3}
                className="w-full resize-none rounded-md border border-[#eaeaea] px-3 py-2 text-sm focus:ring-2 focus:ring-[#111] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input {...form.register("is_nursing_care")} id="edit-nursing" type="checkbox" />
              <label htmlFor="edit-nursing" className="text-sm text-[#888]">
                要介護被保険者
              </label>
            </div>
            {serverError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {serverError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-black hover:bg-[#111]"
              >
                {form.formState.isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
