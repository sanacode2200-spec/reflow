"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm, type Resolver, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ChevronLeft, Pencil, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PatientRow } from "@/lib/actions/patient";
import {
  createRehabDocument,
  deleteRehabDocument,
  updateRehabDocument,
} from "@/lib/actions/rehab-document";
import { rehabDocumentSchema, type RehabDocumentFormData } from "@/lib/validators/rehab-document";
import type { RehabDocumentRow } from "@/lib/db/schema/rehab-documents";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  tenantId: string;
  patient: PatientRow;
  document?: RehabDocumentRow;
  backHref: string;
};

type Register = UseFormRegister<RehabDocumentFormData>;

const SOURCE_W = 2139;
const SOURCE_H = 3025;

const blankContent: RehabDocumentFormData["content"] = {
  main_disability: "",
  long_term_goal: "",
  short_term_goal: "",
  goal_period: "1ヶ月",
  b21_checks: {},
  b21_text: {},
  treatment_content: "",
  comorbidities: "",
  rest_risk: "",
  contraindications: "",
  body_functions: "",
  basic_movements: "",
  adl_scores: "",
  assistive_devices: "",
  monthly_status: "",
  nutrition: "",
  oral: "",
  social_services: "",
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
};

const genderLabel = { male: "男", female: "女", other: "その他" };

function pct(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

function fmtDateParts(value: string | null | undefined) {
  if (!value) return { y: "", m: "", d: "" };
  const [y, m, d] = value.split("-");
  return { y, m, d };
}

function textPath(name: string) {
  return `content.b21_text.${name}` as `content.b21_text.${string}`;
}

function checkPath(name: string) {
  return `content.b21_checks.${name}` as `content.b21_checks.${string}`;
}

function styleRect(x: number, y: number, w: number, h: number) {
  return {
    left: pct(x, SOURCE_W),
    top: pct(y, SOURCE_H),
    width: pct(w, SOURCE_W),
    height: pct(h, SOURCE_H),
  };
}

function StaticText({
  x,
  y,
  w,
  h,
  children,
  className,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute flex items-center px-1 text-[10px] leading-tight text-black",
        className
      )}
      style={styleRect(x, y, w, h)}
    >
      {children}
    </div>
  );
}

function Field({
  register,
  name,
  readOnly,
  x,
  y,
  w,
  h,
  className,
  contentPath,
}: {
  register: Register;
  name?: string;
  readOnly: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  className?: string;
  contentPath?: keyof RehabDocumentFormData["content"];
}) {
  const field = contentPath ? (`content.${contentPath}` as const) : textPath(name ?? "");
  return (
    <textarea
      readOnly={readOnly}
      {...register(field)}
      className={cn(
        "absolute resize-none overflow-hidden border border-transparent bg-transparent px-[2px] py-[1px] text-[9px] leading-[1.18] text-black outline-none",
        !readOnly && "focus:border-sky-500/50 focus:bg-sky-50/10",
        className
      )}
      style={styleRect(x, y, w, h)}
    />
  );
}

function InputField({
  register,
  name,
  readOnly,
  x,
  y,
  w,
  h,
  className,
}: {
  register: Register;
  name: string;
  readOnly: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  className?: string;
}) {
  return (
    <input
      readOnly={readOnly}
      {...register(textPath(name))}
      className={cn(
        "absolute border border-transparent bg-transparent px-[1px] py-0 text-[9px] leading-none text-black outline-none",
        !readOnly && "focus:border-sky-500/50 focus:bg-sky-50/10",
        className
      )}
      style={styleRect(x, y, w, h)}
    />
  );
}

function Box({
  register,
  name,
  readOnly,
  x,
  y,
  size = 18,
}: {
  register: Register;
  name: string;
  readOnly: boolean;
  x: number;
  y: number;
  size?: number;
}) {
  return (
    <input
      type="checkbox"
      disabled={readOnly}
      {...register(checkPath(name))}
      className="absolute appearance-none bg-transparent checked:bg-black disabled:opacity-100"
      style={styleRect(x, y, size, size)}
    />
  );
}

function OverlayPage({ src, children }: { src: string; children: React.ReactNode }) {
  return (
    <section className="relative h-[1584px] w-[1120px] overflow-hidden bg-white shadow-sm print:shadow-none">
      <Image src={src} alt="" fill sizes="1120px" className="select-none" draggable={false} />
      {children}
    </section>
  );
}

const leftFunctionChecks = [
  ["jcs_gcs", 58, 450],
  ["respiratory", 58, 504],
  ["oxygen", 124, 542],
  ["tracheotomy", 666, 542],
  ["ventilator", 826, 542],
  ["circulation", 58, 590],
  ["ef", 124, 628],
  ["arrhythmia_yes", 664, 628],
  ["arrhythmia_no", 721, 628],
  ["hypertension", 58, 668],
  ["dyslipidemia", 306, 668],
  ["diabetes", 543, 668],
  ["smoking", 785, 668],
  ["obesity", 58, 704],
  ["hyperuricemia", 306, 704],
  ["ckd", 543, 704],
  ["family_history", 785, 704],
  ["angina", 58, 742],
  ["old_mi", 306, 742],
  ["risk_other", 785, 742],
  ["dysphagia", 58, 780],
  ["malnutrition", 58, 818],
  ["urination", 58, 856],
  ["pressure_ulcer", 58, 894],
  ["pain", 58, 932],
  ["function_other", 58, 970],
] as const;

const rightFunctionChecks = [
  ["rom", 1137, 450],
  ["contracture", 1137, 489],
  ["weakness", 1137, 528],
  ["motor", 1137, 566],
  ["motor_palsy", 1311, 566],
  ["motor_involuntary", 1424, 566],
  ["motor_ataxia", 1588, 566],
  ["motor_parkinsonism", 1733, 566],
  ["tone", 1137, 604],
  ["sensory", 1137, 642],
  ["sensory_hearing", 1308, 642],
  ["sensory_vision", 1404, 642],
  ["sensory_superficial", 1494, 642],
  ["sensory_deep", 1614, 642],
  ["speech", 1137, 680],
  ["higher_brain", 1137, 756],
  ["higher_memory", 1354, 756],
  ["higher_attention", 1447, 756],
  ["higher_apraxia", 1534, 756],
  ["higher_agnosia", 1623, 756],
  ["higher_executive", 1712, 756],
  ["behavior", 1137, 795],
  ["orientation", 1137, 833],
  ["memory_impairment", 1137, 872],
  ["developmental", 1137, 910],
  ["dev_asd", 1304, 910],
  ["dev_ld", 1555, 910],
  ["dev_adhd", 1690, 910],
  ["dev_other", 1304, 946],
  ["dementia", 1137, 984],
] as const;

const basicMotionChecks = [
  ["rolling_ind", 319, 1043],
  ["rolling_part", 391, 1043],
  ["rolling_help", 493, 1043],
  ["rolling_none", 573, 1043],
  ["situp_ind", 319, 1081],
  ["situp_part", 391, 1081],
  ["situp_help", 493, 1081],
  ["situp_none", 573, 1081],
  ["standup_ind", 319, 1119],
  ["standup_part", 391, 1119],
  ["standup_help", 493, 1119],
  ["standup_none", 573, 1119],
  ["sitting_ind", 1398, 1043],
  ["sitting_part", 1471, 1043],
  ["sitting_help", 1573, 1043],
  ["sitting_none", 1652, 1043],
  ["standing_ind", 1398, 1081],
  ["standing_part", 1471, 1081],
  ["standing_help", 1573, 1081],
  ["standing_none", 1652, 1081],
] as const;

const page2ActivityChecks = [
  ["home", 57, 526],
  ["home_house", 156, 557],
  ["home_detached", 272, 557],
  ["home_mansion", 428, 557],
  ["home_facility", 603, 557],
  ["home_other", 718, 557],
  ["work_current", 156, 620],
  ["work_reassign", 426, 620],
  ["work_change", 584, 620],
  ["work_no", 704, 620],
  ["work_other", 822, 620],
  ["commute_change", 156, 654],
  ["school_possible", 156, 717],
  ["school_consideration", 306, 717],
  ["school_change", 586, 717],
  ["school_no", 704, 717],
  ["school_other", 823, 717],
  ["floor_ind", 156, 919],
  ["floor_help", 306, 919],
  ["floor_none", 436, 919],
  ["floor_device", 156, 956],
  ["floor_env", 370, 956],
  ["indoor_ind", 156, 1028],
  ["indoor_help", 306, 1028],
  ["indoor_none", 436, 1028],
  ["indoor_device", 156, 1064],
  ["outdoor_ind", 156, 1139],
  ["outdoor_help", 306, 1139],
  ["outdoor_none", 436, 1139],
  ["outdoor_device", 156, 1174],
  ["drive_ind", 156, 1247],
  ["drive_help", 306, 1247],
  ["drive_none", 436, 1247],
  ["drive_remodel", 156, 1284],
  ["transport_ind", 156, 1356],
  ["transport_help", 306, 1356],
  ["transport_none", 436, 1356],
  ["transport_type", 156, 1394],
  ["toilet_ind", 156, 1504],
  ["toilet_help", 306, 1504],
  ["toilet_lower", 468, 1504],
  ["toilet_wipe", 614, 1504],
  ["toilet_catheter", 798, 1504],
  ["toilet_western", 238, 1542],
  ["toilet_japanese", 341, 1542],
  ["meal_ind", 156, 1617],
  ["meal_help", 306, 1617],
  ["meal_none", 436, 1617],
  ["meal_chopsticks", 156, 1654],
  ["meal_fork", 274, 1654],
  ["meal_tube", 430, 1654],
  ["grooming_ind", 156, 1767],
  ["grooming_help", 306, 1767],
  ["dressing_ind", 156, 1840],
  ["dressing_help", 306, 1840],
  ["bathing_ind", 156, 1914],
  ["bathing_help", 306, 1914],
  ["bath_tub", 156, 1951],
  ["bath_shower", 306, 1951],
  ["bath_wash", 156, 1988],
  ["bath_transfer", 306, 1988],
  ["housework_all", 156, 2100],
  ["housework_none", 306, 2100],
  ["housework_part", 436, 2100],
  ["writing_ind", 156, 2174],
  ["writing_switch", 306, 2174],
  ["writing_other", 606, 2174],
  ["ict_ind", 156, 2286],
  ["ict_help", 306, 2286],
  ["comm_ind", 156, 2360],
  ["comm_help", 306, 2360],
  ["comm_device", 156, 2397],
  ["comm_board", 474, 2397],
  ["comm_support", 670, 2397],
] as const;

export default function B21PlanForm({ tenantId, patient, document: doc, backHref }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!doc);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const age = useMemo(() => {
    const birth = new Date(`${patient.birth_date}T00:00:00`);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years -= 1;
    return years;
  }, [patient.birth_date]);

  const onset = fmtDateParts(patient.onset_date);
  const rehabStart = fmtDateParts(patient.rehab_start_date);
  const content = {
    ...blankContent,
    ...(doc?.content ?? {}),
    b21_checks: { ...(doc?.content?.b21_checks ?? {}) },
    b21_text: { ...(doc?.content?.b21_text ?? {}) },
  };

  const form = useForm<RehabDocumentFormData>({
    resolver: zodResolver(rehabDocumentSchema) as Resolver<RehabDocumentFormData>,
    defaultValues: {
      patient_id: patient.id,
      document_date: doc?.document_date ?? format(new Date(), "yyyy-MM-dd"),
      valid_from: doc?.valid_from ?? "",
      valid_to: doc?.valid_to ?? "",
      content,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const readOnly = !isEditing;

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
    } else if (result && "id" in result) {
      router.push(`/patients/${patient.id}/documents/${result.id}`);
    }
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full")}
          >
            <ChevronLeft size={15} />
            書類一覧
          </Link>
          <div>
            <h1 className="text-foreground text-lg font-bold">リハビリテーション実施計画書</h1>
            <p className="text-muted-foreground text-xs">
              {patient.name_kanji} / {patient.patient_code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {doc && !isEditing && (
            <>
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

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
        <input type="hidden" {...register("patient_id")} />
        <div className="mx-auto w-[1120px] space-y-6">
          <OverlayPage src="/b21-page1.png">
            <StaticText x={208} y={192} w={520} h={34}>
              {patient.name_kanji}（{patient.name_kana}）
            </StaticText>
            <StaticText x={208} y={230} w={520} h={34}>
              {patient.main_diagnosis}
            </StaticText>
            <StaticText x={778} y={190} w={210} h={34}>
              性別（ {genderLabel[patient.gender]} ）
            </StaticText>
            <StaticText x={1084} y={190} w={170} h={34}>
              年齢（ {age} 歳 ）
            </StaticText>
            <StaticText x={1598} y={228} w={300} h={30}>
              発症日（ {onset.y} 年 {onset.m} 月 {onset.d} 日 ）
            </StaticText>
            <StaticText x={1598} y={302} w={330} h={30}>
              リハ開始日（ {rehabStart.y} 年 {rehabStart.m} 月 {rehabStart.d} 日 ）
            </StaticText>
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="treatment_content"
              x={772}
              y={226}
              w={478}
              h={72}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="surgery_date"
              x={1598}
              y={264}
              w={295}
              h={28}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="comorbidities"
              x={58}
              y={355}
              w={690}
              h={77}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="rest_risk"
              x={772}
              y={355}
              w={330}
              h={77}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="contraindications"
              x={1118}
              y={355}
              w={970}
              h={77}
            />

            {[...leftFunctionChecks, ...rightFunctionChecks, ...basicMotionChecks].map(
              ([name, x, y]) => (
                <Box key={name} register={register} readOnly={readOnly} name={name} x={x} y={y} />
              )
            )}
            <InputField
              register={register}
              readOnly={readOnly}
              name="jcs_gcs_note"
              x={250}
              y={448}
              w={170}
              h={28}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="oxygen_l"
              x={316}
              y={540}
              w={120}
              h={28}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="ef"
              x={210}
              y={626}
              w={110}
              h={28}
            />
            {[
              "dysphagia",
              "malnutrition",
              "urination",
              "pressure_ulcer",
              "pain",
              "function_other",
            ].map((name, index) => (
              <InputField
                key={name}
                register={register}
                readOnly={readOnly}
                name={`${name}_note`}
                x={352}
                y={778 + index * 38}
                w={560}
                h={28}
              />
            ))}
            {(
              [
                ["rom", 448],
                ["contracture", 487],
                ["weakness", 526],
                ["tone", 602],
                ["behavior", 793],
                ["orientation", 831],
                ["memory_impairment", 870],
              ] as Array<[string, number]>
            ).map(([name, y]) => (
              <InputField
                key={name}
                register={register}
                readOnly={readOnly}
                name={`${name}_note`}
                x={1420}
                y={y}
                w={560}
                h={28}
              />
            ))}
            <InputField
              register={register}
              readOnly={readOnly}
              name="speech_note"
              x={1580}
              y={680}
              w={385}
              h={28}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="developmental_other"
              x={1530}
              y={945}
              w={460}
              h={28}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="basic_other"
              x={1490}
              y={1118}
              w={380}
              h={28}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="main_disability"
              x={1132}
              y={1003}
              w={900}
              h={48}
            />

            <Field
              register={register}
              readOnly={readOnly}
              contentPath="adl_scores"
              x={302}
              y={1220}
              w={510}
              h={442}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="walking_device"
              x={330}
              y={1655}
              w={250}
              h={24}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="assistive_devices"
              x={1280}
              y={1224}
              w={770}
              h={500}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="monthly_status"
              x={1280}
              y={1788}
              w={770}
              h={120}
            />

            <InputField
              register={register}
              readOnly={readOnly}
              name="height"
              x={250}
              y={2068}
              w={100}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="weight"
              x={612}
              y={2068}
              w={100}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="bmi"
              x={912}
              y={2068}
              w={86}
              h={24}
            />
            {[
              ["nutrition_oral", 491, 2110],
              ["nutrition_meal", 581, 2110],
              ["nutrition_supplement", 672, 2110],
              ["nutrition_tube", 817, 2110],
              ["nutrition_nasal", 927, 2110],
              ["nutrition_gastrostomy", 1098, 2110],
              ["nutrition_iv", 1284, 2110],
              ["nutrition_peripheral", 1383, 2110],
              ["nutrition_central", 1480, 2110],
              ["diet_no", 278, 2150],
              ["diet_yes", 363, 2150],
              ["glim_normal", 874, 2188],
              ["glim_moderate", 1149, 2188],
              ["glim_severe", 1342, 2188],
              ["weight_loss", 548, 2226],
              ["low_bmi", 686, 2226],
              ["muscle_loss", 795, 2226],
              ["intake_loss", 1094, 2226],
              ["inflammation", 1470, 2226],
              ["non_glim_ok", 506, 2264],
              ["overnutrition", 662, 2264],
              ["nutrition_other", 790, 2264],
            ].map(([name, x, y]) => (
              <Box
                key={name as string}
                register={register}
                readOnly={readOnly}
                name={name as string}
                x={x as number}
                y={y as number}
              />
            ))}
            <InputField
              register={register}
              readOnly={readOnly}
              name="diet_code"
              x={865}
              y={2150}
              w={140}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="required_kcal"
              x={680}
              y={2340}
              w={120}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="required_protein"
              x={1250}
              y={2340}
              w={85}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="intake_kcal"
              x={680}
              y={2384}
              w={120}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="intake_protein"
              x={1250}
              y={2384}
              w={85}
              h={24}
            />

            {[
              ["dentures_yes", 208, 2465],
              ["dentures_no", 266, 2465],
              ["gum_yes", 731, 2465],
              ["gum_no", 790, 2465],
              ["tooth_dirty_yes", 208, 2502],
              ["tooth_dirty_no", 266, 2502],
              ["molar_no", 792, 2502],
              ["molar_yes", 890, 2502],
              ["care_required", 58, 2578],
              ["care_not_applied", 350, 2578],
              ["care_applying", 107, 2612],
              ["care_unknown", 236, 2612],
              ["support_1", 411, 2612],
              ["support_2", 508, 2612],
              ["care_1", 411, 2649],
              ["care_2", 508, 2649],
              ["care_3", 592, 2649],
              ["care_4", 676, 2649],
              ["care_5", 760, 2649],
              ["physical_certificate", 810, 2578],
              ["mental_certificate", 1252, 2578],
              ["therapy_certificate", 1542, 2578],
              ["welfare_other", 1852, 2578],
              ["long_term_care_needed", 1667, 2769],
              ["therapy_pt", 1138, 2876],
              ["therapy_ot", 1138, 2912],
              ["therapy_st", 1138, 2948],
            ].map(([name, x, y]) => (
              <Box
                key={name as string}
                register={register}
                readOnly={readOnly}
                name={name as string}
                x={x as number}
                y={y as number}
              />
            ))}
            <InputField
              register={register}
              readOnly={readOnly}
              name="oral_other"
              x={1822}
              y={2502}
              w={240}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="physical_type"
              x={915}
              y={2652}
              w={70}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="physical_grade"
              x={1075}
              y={2652}
              w={70}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="mental_grade"
              x={1372}
              y={2652}
              w={70}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="therapy_grade"
              x={1648}
              y={2652}
              w={90}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="welfare_other_note"
              x={1855}
              y={2622}
              w={170}
              h={34}
            />

            <Field
              register={register}
              readOnly={readOnly}
              contentPath="short_term_goal"
              x={58}
              y={2714}
              w={1010}
              h={132}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="long_term_goal"
              x={1084}
              y={2714}
              w={970}
              h={82}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="planned_hospitalization"
              x={1678}
              y={2805}
              w={320}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="discharge_destination"
              x={1678}
              y={2842}
              w={320}
              h={24}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="treatment_policy"
              x={58}
              y={2872}
              w={610}
              h={74}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="rehab_content"
              x={1138}
              y={2868}
              w={890}
              h={102}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="medical_institution"
              x={180}
              y={2976}
              w={1120}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="rehab_doctor"
              x={1442}
              y={2976}
              w={270}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="attending_doctor"
              x={1775}
              y={2976}
              w={270}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="explanation_date"
              x={1220}
              y={3000}
              w={360}
              h={22}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="explainer"
              x={1700}
              y={3000}
              w={330}
              h={22}
            />
          </OverlayPage>

          <OverlayPage src="/b21-page2.png">
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="history_status"
              x={58}
              y={248}
              w={2018}
              h={204}
            />
            {page2ActivityChecks.map(([name, x, y]) => (
              <Box key={name} register={register} readOnly={readOnly} name={name} x={x} y={y} />
            ))}
            <InputField
              register={register}
              readOnly={readOnly}
              name="home_other"
              x={746}
              y={557}
              w={220}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="work_other"
              x={880}
              y={620}
              w={170}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="school_other"
              x={880}
              y={717}
              w={170}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="school_place"
              x={260}
              y={754}
              w={285}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="school_commute"
              x={748}
              y={754}
              w={285}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="home_role"
              x={260}
              y={792}
              w={720}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="social_activity"
              x={260}
              y={830}
              w={720}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="hobby"
              x={260}
              y={868}
              w={720}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="floor_note"
              x={482}
              y={956}
              w={210}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="indoor_device_note"
              x={472}
              y={1064}
              w={260}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="drive_remodel_note"
              x={270}
              y={1284}
              w={220}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="transport_type_note"
              x={270}
              y={1394}
              w={220}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="toilet_note"
              x={775}
              y={1542}
              w={235}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="meal_form"
              x={286}
              y={1690}
              w={220}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="housework_note"
              x={618}
              y={2100}
              w={230}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="writing_note"
              x={710}
              y={2174}
              w={210}
              h={24}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="activity_goal"
              x={60}
              y={2428}
              w={1000}
              h={48}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="concrete_approach"
              x={1084}
              y={500}
              w={990}
              h={724}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="family_info"
              x={1084}
              y={1262}
              w={990}
              h={276}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="home_environment"
              x={1084}
              y={1577}
              w={990}
              h={214}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="pre_discharge_visit"
              x={1550}
              y={1847}
              w={430}
              h={24}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="outing_plan"
              x={1550}
              y={1884}
              w={430}
              h={24}
            />
            <Box
              register={register}
              readOnly={readOnly}
              name="exercise_device_addition"
              x={1084}
              y={1921}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="exercise_disease"
              x={1306}
              y={1995}
              w={360}
              h={24}
            />
            <Box register={register} readOnly={readOnly} name="exercise_upper" x={1327} y={2032} />
            <Box register={register} readOnly={readOnly} name="exercise_lower" x={1467} y={2032} />
            <InputField
              register={register}
              readOnly={readOnly}
              name="exercise_onset"
              x={1306}
              y={2069}
              w={360}
              h={24}
            />
            <Field
              register={register}
              readOnly={readOnly}
              name="exercise_findings"
              x={1306}
              y={2106}
              w={660}
              h={86}
            />
            <Field
              register={register}
              readOnly={readOnly}
              name="exercise_device_plan"
              x={1306}
              y={2230}
              w={660}
              h={110}
            />
            {["1", "2", "3", "4", "5", "6", "7"].map((n, index) => (
              <Box
                key={n}
                register={register}
                readOnly={readOnly}
                name={`fois_${n}`}
                x={164 + index * 118}
                y={2355}
              />
            ))}
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="swallowing_status"
              x={58}
              y={2394}
              w={1008}
              h={95}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="swallowing_plan"
              x={1084}
              y={2338}
              w={990}
              h={150}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="guidance_content"
              x={58}
              y={2540}
              w={2016}
              h={100}
            />
            <Box
              register={register}
              readOnly={readOnly}
              name="care_rehab_referral"
              x={58}
              y={2678}
            />
            <Box
              register={register}
              readOnly={readOnly}
              name="disability_referral"
              x={1190}
              y={2678}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="service_coordination"
              x={58}
              y={2728}
              w={2016}
              h={132}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="discharge_notes"
              x={58}
              y={2904}
              w={2016}
              h={92}
            />
            <Field
              register={register}
              readOnly={readOnly}
              contentPath="other_plan_notes"
              x={58}
              y={2996}
              w={2016}
              h={26}
            />
            <InputField
              register={register}
              readOnly={readOnly}
              name="evaluation_date"
              x={1745}
              y={2974}
              w={270}
              h={24}
            />
          </OverlayPage>
          {errors.content?.main_disability && (
            <p className="text-destructive text-xs">{errors.content.main_disability.message}</p>
          )}
        </div>
      </div>
    </form>
  );
}
