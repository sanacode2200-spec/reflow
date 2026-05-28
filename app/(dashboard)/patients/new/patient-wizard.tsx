"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type UseFormReturn, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPatient, type PatientFormData } from "@/lib/actions/patient";
import { checkAdditions } from "@/lib/rehab/additions";
import { differenceInYears, format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft, AlertTriangle, CheckCircle } from "lucide-react";
import {
  DISEASE_LABEL,
  GENDER_OPTIONS,
  INSURANCE_OPTIONS,
  ONSET_TYPE_OPTIONS,
  PATIENT_TYPE_OPTIONS,
  patientFormSchema,
  type PatientForm as Form,
} from "@/lib/validators/patient";

type Staff = { id: string; name: string; occupation: string };
type Props = { tenantId: string; staffs: Staff[] };

const stepTitles = ["基本情報", "保険・診療", "リハビリ情報", "確認"];
const stepFields: (keyof Form)[][] = [
  ["patient_code", "name_kanji", "name_kana", "birth_date", "gender", "patient_type"],
  ["insurance_type", "main_diagnosis", "disease_category"],
  ["rehab_start_date", "onset_date", "onset_type"],
  [],
];
const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm transition-colors outline-none focus:ring-3 focus:ring-ring/50";

export default function PatientWizard({ tenantId, staffs }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<Form>({
    resolver: zodResolver(patientFormSchema) as Resolver<Form>,
    defaultValues: {
      patient_code: "",
      name_kanji: "",
      name_kana: "",
      birth_date: "",
      gender: "male",
      patient_type: "outpatient",
      insurance_type: "medical",
      main_diagnosis: "",
      disease_category: "musculoskeletal",
      facility_grade: "grade_2",
      rehab_start_date: format(new Date(), "yyyy-MM-dd"),
      onset_date: "",
      onset_type: "onset",
      pt_therapist_id: staffs.find((s) => s.occupation === "pt")?.id ?? "",
      ot_therapist_id: "",
      st_therapist_id: "",
      is_nursing_care: false,
      medical_history: "",
    },
    mode: "onChange",
  });

  const watchedOnsetDate = useWatch({ control: form.control, name: "onset_date" });
  const watchedRehabStart = useWatch({ control: form.control, name: "rehab_start_date" });
  const additionAlert =
    watchedOnsetDate && watchedRehabStart
      ? checkAdditions(watchedOnsetDate, watchedRehabStart)
      : null;

  const goNext = async () => {
    const fields = stepFields[step];
    if (fields && fields.length > 0) {
      const valid = await form.trigger(fields as Parameters<typeof form.trigger>[0]);
      if (!valid) return;
    }
    // ステップ2（リハビリ情報）では主担当の1人以上チェック
    if (step === 2) {
      const { pt_therapist_id, ot_therapist_id, st_therapist_id } = form.getValues();
      if (!pt_therapist_id && !ot_therapist_id && !st_therapist_id) {
        form.setError("pt_therapist_id", {
          message: "PT・OT・STのいずれか1人以上選択してください",
        });
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async (data: Form) => {
    setServerError(null);
    try {
      await createPatient(tenantId, data as PatientFormData);
      router.push("/patients");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "エラーが発生しました");
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      {/* Step indicator */}
      <div className="mb-8 flex items-center">
        {stepTitles.map((title, i) => (
          <div key={i} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  i < step
                    ? "bg-foreground text-background"
                    : i === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`mt-1 text-xs ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}
              >
                {title}
              </span>
            </div>
            {i < stepTitles.length - 1 && (
              <div
                className={`mx-2 mb-4 flex-1 border-t-2 transition-colors ${i < step ? "border-foreground" : "border-border"}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          {step === 0 && <Step1 form={form} />}
          {step === 1 && <Step2 form={form} />}
          {step === 2 && <Step3 form={form} staffs={staffs} additionAlert={additionAlert} />}
          {step === 3 && <Step4 form={form} staffs={staffs} additionAlert={additionAlert} />}

          {serverError && (
            <p className="border-destructive/20 bg-destructive/10 text-destructive mt-4 rounded-lg border px-3 py-2 text-sm">
              {serverError}
            </p>
          )}

          <div className="mt-6 flex justify-between">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft size={14} className="mr-1" />
                戻る
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => router.push("/patients")}>
                キャンセル
              </Button>
            )}
            {step < stepTitles.length - 1 ? (
              <Button type="button" onClick={goNext}>
                次へ
                <ChevronRight size={14} className="ml-1" />
              </Button>
            ) : (
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "登録中..." : "登録する"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-destructive mt-1 text-xs">{msg}</p>;
}

function SelectField({
  label,
  ...props
}: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} aria-label={props["aria-label"] ?? label} className={selectClass}>
      {props.children}
    </select>
  );
}

function Step1({ form }: { form: UseFormReturn<Form> }) {
  const birthDate = useWatch({ control: form.control, name: "birth_date" });
  const patientType = useWatch({ control: form.control, name: "patient_type" });
  const age = birthDate ? differenceInYears(new Date(), parseISO(birthDate)) : null;

  return (
    <div className="space-y-4">
      <h2 className="text-foreground font-semibold">基本情報</h2>
      <div className="space-y-1.5">
        <Label>患者ID</Label>
        <Input {...form.register("patient_code")} placeholder="例: P001" />
        <FieldError msg={form.formState.errors.patient_code?.message} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>氏名（漢字）</Label>
          <Input {...form.register("name_kanji")} placeholder="山田 太郎" />
          <FieldError msg={form.formState.errors.name_kanji?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>氏名（カナ）</Label>
          <Input {...form.register("name_kana")} placeholder="ヤマダ タロウ" />
          <FieldError msg={form.formState.errors.name_kana?.message} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>生年月日</Label>
          <Input {...form.register("birth_date")} type="date" />
          {age !== null && <p className="text-muted-foreground text-xs">{age}歳</p>}
          <FieldError msg={form.formState.errors.birth_date?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>性別</Label>
          <SelectField label="性別" {...form.register("gender")}>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>入院 / 外来</Label>
        <div className="flex gap-2">
          {PATIENT_TYPE_OPTIONS.map((o) => {
            const selected = patientType === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() =>
                  form.setValue("patient_type", o.value as "inpatient" | "outpatient", {
                    shouldValidate: true,
                  })
                }
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step2({ form }: { form: UseFormReturn<Form> }) {
  return (
    <div className="space-y-4">
      <h2 className="text-foreground font-semibold">保険・診療</h2>
      <div className="space-y-1.5">
        <Label>保険種別</Label>
        <SelectField label="保険種別" {...form.register("insurance_type")}>
          {INSURANCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="space-y-1.5">
        <Label>主病名</Label>
        <Input {...form.register("main_diagnosis")} placeholder="例: 右大腿骨頸部骨折" />
        <FieldError msg={form.formState.errors.main_diagnosis?.message} />
      </div>
      <div className="space-y-1.5">
        <Label>疾患別区分</Label>
        <SelectField label="疾患別区分" {...form.register("disease_category")}>
          {Object.entries(DISEASE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </SelectField>
        <FieldError msg={form.formState.errors.disease_category?.message} />
      </div>
      <div className="space-y-1.5">
        <Label>施設基準区分</Label>
        <div className="border-border bg-muted text-muted-foreground rounded-lg border px-3 py-2 text-sm">
          運動器リハビリテーション料（II）（Phase1固定）
        </div>
      </div>
    </div>
  );
}

function TherapistSelect({
  label,
  occupation,
  staffs,
  value,
  onChange,
  error,
}: {
  label: string;
  occupation: string;
  staffs: Staff[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const filtered = staffs.filter((s) => s.occupation === occupation);
  return (
    <div className="space-y-1.5">
      <Label>
        <span className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
          {occupation.toUpperCase()}
        </span>{" "}
        {label}
      </Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">— なし —</option>
        {filtered.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

function Step3({
  form,
  staffs,
  additionAlert,
}: {
  form: UseFormReturn<Form>;
  staffs: Staff[];
  additionAlert: ReturnType<typeof checkAdditions> | null;
}) {
  const ptError = form.formState.errors.pt_therapist_id?.message;
  const therapistIds = useWatch({
    control: form.control,
    name: ["pt_therapist_id", "ot_therapist_id", "st_therapist_id"],
  });

  return (
    <div className="space-y-4">
      <h2 className="text-foreground font-semibold">リハビリ情報</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>リハビリ開始日</Label>
          <Input {...form.register("rehab_start_date")} type="date" />
          <FieldError msg={form.formState.errors.rehab_start_date?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>起算日の種別</Label>
          <SelectField label="起算日種別" {...form.register("onset_type")}>
            {ONSET_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>起算日</Label>
        <Input {...form.register("onset_date")} type="date" />
        <FieldError msg={form.formState.errors.onset_date?.message} />
      </div>

      {additionAlert && (
        <div className="space-y-2">
          {additionAlert.initial && (
            <div className="bg-primary/10 text-primary flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
              <CheckCircle size={14} />
              <strong>初期加算対象</strong>（起算日から{14 - additionAlert.initialDaysLeft}日目）
            </div>
          )}
          {additionAlert.early && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle size={14} />
              <strong>早期加算対象</strong>（起算日から{30 - additionAlert.earlyDaysLeft}日目）
            </div>
          )}
          {!additionAlert.initial && !additionAlert.early && (
            <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
              <AlertTriangle size={14} />
              初期加算・早期加算の対象外（起算日から{30 + additionAlert.earlyDaysLeft}日以上経過）
            </div>
          )}
        </div>
      )}

      <div className="border-border space-y-3 rounded-lg border p-4">
        <p className="text-foreground text-sm font-medium">
          主担当
          <span className="text-muted-foreground ml-1.5 text-xs font-normal">（1人以上必須）</span>
        </p>
        <TherapistSelect
          label="主担当"
          occupation="pt"
          staffs={staffs}
          value={therapistIds[0] ?? ""}
          onChange={(v) => form.setValue("pt_therapist_id", v, { shouldValidate: true })}
          error={ptError}
        />
        <TherapistSelect
          label="主担当"
          occupation="ot"
          staffs={staffs}
          value={therapistIds[1] ?? ""}
          onChange={(v) => form.setValue("ot_therapist_id", v, { shouldValidate: true })}
        />
        <TherapistSelect
          label="主担当"
          occupation="st"
          staffs={staffs}
          value={therapistIds[2] ?? ""}
          onChange={(v) => form.setValue("st_therapist_id", v, { shouldValidate: true })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>既往歴・注意事項（任意）</Label>
        <textarea
          {...form.register("medical_history")}
          rows={3}
          placeholder="既往歴や注意事項を入力..."
          className="border-input focus:ring-ring/50 w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-3"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          {...form.register("is_nursing_care")}
          id="nursing"
          type="checkbox"
          className="rounded"
        />
        <label htmlFor="nursing" className="text-muted-foreground text-sm">
          要介護被保険者
        </label>
      </div>
    </div>
  );
}

function Step4({
  form,
  staffs,
  additionAlert,
}: {
  form: UseFormReturn<Form>;
  staffs: Staff[];
  additionAlert: ReturnType<typeof checkAdditions> | null;
}) {
  const v = form.getValues();
  const ptStaff = staffs.find((s) => s.id === v.pt_therapist_id);
  const otStaff = staffs.find((s) => s.id === v.ot_therapist_id);
  const stStaff = staffs.find((s) => s.id === v.st_therapist_id);
  const age = v.birth_date ? differenceInYears(new Date(), parseISO(v.birth_date)) : "—";

  const therapistSummary = [
    ptStaff ? `PT ${ptStaff.name}` : null,
    otStaff ? `OT ${otStaff.name}` : null,
    stStaff ? `ST ${stStaff.name}` : null,
  ]
    .filter(Boolean)
    .join("、");

  const rows = [
    ["患者ID", v.patient_code],
    ["氏名", `${v.name_kanji}（${v.name_kana}）`],
    ["生年月日", `${v.birth_date}（${age}歳）`],
    ["性別", GENDER_OPTIONS.find((o) => o.value === v.gender)?.label ?? ""],
    ["入院 / 外来", PATIENT_TYPE_OPTIONS.find((o) => o.value === v.patient_type)?.label ?? ""],
    ["保険種別", INSURANCE_OPTIONS.find((o) => o.value === v.insurance_type)?.label ?? ""],
    ["主病名", v.main_diagnosis],
    ["疾患別区分", DISEASE_LABEL[v.disease_category] ?? ""],
    ["リハビリ開始日", v.rehab_start_date],
    [
      "起算日",
      `${v.onset_date}（${ONSET_TYPE_OPTIONS.find((o) => o.value === v.onset_type)?.label ?? ""}）`,
    ],
    ["主担当", therapistSummary || "—"],
    ["要介護被保険者", v.is_nursing_care ? "あり" : "なし"],
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-foreground font-semibold">確認</h2>
      <dl className="divide-border border-border divide-y rounded-lg border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex px-4 py-2.5 text-sm">
            <dt className="text-muted-foreground w-36 shrink-0">{label}</dt>
            <dd className="text-foreground font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {additionAlert && (
        <div className="space-y-1.5">
          {additionAlert.initial && (
            <div className="bg-primary/10 text-primary flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
              <CheckCircle size={14} />
              <strong>初期加算対象</strong>
            </div>
          )}
          {additionAlert.early && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle size={14} />
              <strong>早期加算対象</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
