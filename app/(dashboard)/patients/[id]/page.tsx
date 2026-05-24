import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTenantIdFromUser } from "@/lib/actions/staff";
import { getPatient } from "@/lib/actions/patient";
import { getStaffs } from "@/lib/actions/schedule";
import { checkAdditions } from "@/lib/rehab/additions";
import { differenceInDays, differenceInYears, parseISO } from "date-fns";
import { CheckCircle, AlertTriangle, ChevronLeft, ClipboardList } from "lucide-react";
import PatientEditModal from "./patient-edit-modal";

const GENDER = { male: "男性", female: "女性", other: "その他" };
const INSURANCE = { medical: "医療保険", workers_comp: "労災保険", auto_liability: "自賠責保険" };
const DISEASE = {
  cerebrovascular: "脳血管疾患等（180日）",
  musculoskeletal: "運動器（150日）",
  disuse_syndrome: "廃用症候群（120日）",
  cardiovascular: "心大血管（150日）",
  respiratory: "呼吸器（90日）",
};
const ONSET_TYPE = { onset: "発症日", surgery: "手術日", acute_exacerbation: "急性増悪日" };
const STD_DAYS = {
  cerebrovascular: 180,
  musculoskeletal: 150,
  disuse_syndrome: 120,
  cardiovascular: 150,
  respiratory: 90,
};

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdFromUser(user.id);
  const [patient, staffList] = await Promise.all([getPatient(id, tenantId), getStaffs(tenantId)]);
  if (!patient) notFound();

  const age = differenceInYears(new Date(), parseISO(patient.birth_date));
  const additionAlert = checkAdditions(patient.onset_date, patient.rehab_start_date);
  const daysFromOnset = differenceInDays(new Date(), parseISO(patient.onset_date));
  const stdDays = STD_DAYS[patient.disease_category] ?? 150;
  const remainingDays = stdDays - daysFromOnset;
  const isOverStd = remainingDays < 0;
  const isNearLimit = remainingDays >= 0 && remainingDays <= 14;

  const sections = [
    {
      title: "基本情報",
      rows: [
        ["患者ID", patient.patient_code],
        ["氏名", `${patient.name_kanji}（${patient.name_kana}）`],
        ["生年月日", `${patient.birth_date}（${age}歳）`],
        ["性別", GENDER[patient.gender]],
        ["入院 / 外来", patient.patient_type === "inpatient" ? "入院中" : "外来通院"],
      ],
    },
    {
      title: "保険・診療",
      rows: [
        ["保険種別", INSURANCE[patient.insurance_type]],
        ["主病名", patient.main_diagnosis],
        ["疾患別区分", DISEASE[patient.disease_category] ?? patient.disease_category],
        ["施設基準", "運動器リハビリテーション料（II）"],
        ["要介護被保険者", patient.is_nursing_care ? "あり" : "なし"],
      ],
    },
    {
      title: "リハビリ情報",
      rows: [
        ["リハビリ開始日", patient.rehab_start_date],
        ["起算日", `${patient.onset_date}（${ONSET_TYPE[patient.onset_type]}）`],
        ["担当療法士", patient.therapist_name],
        ...(patient.medical_history ? [["既往歴・注意事項", patient.medical_history]] : []),
      ],
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/patients" className="text-[#888] hover:text-[#111]">
          <ChevronLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-[#111]">{patient.name_kanji}</h1>
        <span className="rounded bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#888]">
          {patient.patient_code}
        </span>
        {patient.deleted_at && (
          <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-500">アーカイブ済み</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/records?patient_id=${patient.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-[#eaeaea] px-3 py-1.5 text-sm text-[#888] transition-colors hover:bg-[#fafafa] hover:text-[#111]"
          >
            <ClipboardList size={14} />
            実施記録
          </Link>
          <PatientEditModal patient={patient} tenantId={tenantId} staffs={staffList} />
        </div>
      </div>

      {/* アラート */}
      <div className="mb-6 space-y-2">
        {isOverStd && (
          <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            <AlertTriangle size={16} />
            <strong>標準的算定日数超過</strong>（{Math.abs(remainingDays)}日超過）月13単位上限
          </div>
        )}
        {isNearLimit && (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            <AlertTriangle size={16} />
            <strong>標準的算定日数まで残り{remainingDays}日</strong>
          </div>
        )}
        {additionAlert.initial && (
          <div className="flex items-center gap-2 rounded-lg bg-[#f0f7ff] px-4 py-3 text-sm text-[#0070f3]">
            <CheckCircle size={16} />
            <strong>初期加算対象</strong>（起算日から
            {differenceInDays(parseISO(patient.rehab_start_date), parseISO(patient.onset_date))}
            日目）
          </div>
        )}
        {additionAlert.early && (
          <div className="flex items-center gap-2 rounded-lg bg-[#f0fdf4] px-4 py-3 text-sm text-green-700">
            <CheckCircle size={16} />
            <strong>早期加算対象</strong>
          </div>
        )}
      </div>

      {/* 詳細カード */}
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="rounded-xl border border-[#eaeaea] bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-[#888]">{section.title}</h2>
            <dl className="space-y-2">
              {section.rows.map(([label, value]) => (
                <div key={label} className="flex text-sm">
                  <dt className="w-32 shrink-0 text-[#888]">{label}</dt>
                  <dd className="font-medium text-[#111]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
