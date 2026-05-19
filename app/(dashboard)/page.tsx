import { getTenantId } from "@/lib/actions/schedule";
import { getDashboardData, type AlertRow, type TodayScheduleRow } from "@/lib/actions/dashboard";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";
import { Calendar, Users, Zap, AlertTriangle, Clock, ChevronRight } from "lucide-react";

// ---- KPIカード ----
function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 ${accent ? "border-red-200" : "border-[#eaeaea]"}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-[#888]">{label}</span>
        <span
          className={`rounded-md p-1.5 ${accent ? "bg-red-50 text-red-500" : "bg-[#fafafa] text-[#888]"}`}
        >
          <Icon size={14} />
        </span>
      </div>
      <div className="flex items-end gap-1">
        <span
          className={`text-3xl font-bold tracking-tight ${accent && value > 0 ? "text-red-500" : "text-[#111]"}`}
        >
          {value}
        </span>
        <span className="mb-0.5 text-sm text-[#888]">{unit}</span>
      </div>
    </div>
  );
}

// ---- ステータスバッジ ----
const STATUS_CONFIG = {
  scheduled: { label: "予約", bg: "bg-[#fafafa]", text: "text-[#888]", border: "border-[#eaeaea]" },
  draft: {
    label: "一時保存",
    bg: "bg-[#ffedd5]",
    text: "text-[#ea580c]",
    border: "border-[#f97316]",
  },
  completed: {
    label: "実施済",
    bg: "bg-[#f0f7ff]",
    text: "text-[#0070f3]",
    border: "border-[#0070f3]",
  },
} as const;

function StatusBadge({ status }: { status: TodayScheduleRow["session_status"] }) {
  const cfg = STATUS_CONFIG[status ?? "scheduled"];
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      {cfg.label}
    </span>
  );
}

// ---- 今日のスケジュール行 ----
function ScheduleRow({ s }: { s: TodayScheduleRow }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-16 shrink-0 text-right">
        <span className="font-mono text-xs text-[#888]">
          {format(new Date(s.start_at), "HH:mm")}
        </span>
      </div>
      <div className="h-4 w-px bg-[#eaeaea]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#111]">{s.patient_name}</p>
        <p className="text-xs text-[#888]">
          {s.therapist_name}（{s.therapist_occupation.toUpperCase()}）・{s.units}単位
        </p>
      </div>
      <div className="shrink-0">
        <StatusBadge status={s.session_status} />
      </div>
    </div>
  );
}

// ---- アラートバッジ ----
const ALERT_CONFIG = {
  initial_addition: { color: "text-[#0070f3]", bg: "bg-[#f0f7ff]", border: "border-[#0070f3]/20" },
  early_addition: { color: "text-[#0070f3]", bg: "bg-[#f0f7ff]", border: "border-[#0070f3]/20" },
  expiry_warning: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
} as const;

function AlertItem({ a }: { a: AlertRow }) {
  const cfg = ALERT_CONFIG[a.type];
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${cfg.bg} ${cfg.border}`}>
      <AlertTriangle size={14} className={`shrink-0 ${cfg.color}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium ${cfg.color}`}>{a.label}</p>
        <p className="truncate text-sm font-medium text-[#111]">{a.patient_name}</p>
      </div>
      <span className={`shrink-0 text-xs font-medium ${cfg.color}`}>残{a.daysRemaining}日</span>
    </div>
  );
}

export default async function DashboardPage() {
  const tenantId = await getTenantId();
  const { stats, todaySchedules, alerts } = await getDashboardData(tenantId);
  const today = new Date();

  const completedToday = todaySchedules.filter((s) => s.session_status === "completed").length;

  return (
    <div className="min-h-screen bg-[#fafafa] p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#111]">ダッシュボード</h1>
        <p className="mt-0.5 text-sm text-[#888]">
          {format(today, "yyyy年M月d日（E）", { locale: ja })}
        </p>
      </div>

      {/* KPIカード */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="今日の予約" value={stats.todayCount} unit="件" icon={Calendar} />
        <StatCard label="今週の単位数" value={stats.weeklyUnits} unit="単位" icon={Clock} />
        <StatCard label="担当患者数" value={stats.activePatients} unit="名" icon={Users} />
        <StatCard
          label="要確認アラート"
          value={stats.alertCount}
          unit="件"
          icon={Zap}
          accent={stats.alertCount > 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 今日のスケジュール */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#eaeaea] bg-white">
            <div className="flex items-center justify-between border-b border-[#eaeaea] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-[#111]">今日のスケジュール</h2>
                {stats.todayCount > 0 && (
                  <p className="mt-0.5 text-xs text-[#888]">
                    {completedToday}/{stats.todayCount} 件実施済み
                  </p>
                )}
              </div>
              <Link
                href="/schedule"
                className="flex items-center gap-1 text-xs text-[#0070f3] hover:text-[#0060d1]"
              >
                スケジュールへ
                <ChevronRight size={12} />
              </Link>
            </div>

            <div className="divide-y divide-[#eaeaea] px-5">
              {todaySchedules.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[#888]">今日の予約はありません</p>
                  <Link
                    href="/schedule"
                    className="mt-2 inline-block text-xs text-[#0070f3] hover:underline"
                  >
                    予約を追加する
                  </Link>
                </div>
              ) : (
                todaySchedules.map((s) => <ScheduleRow key={s.id} s={s} />)
              )}
            </div>
          </div>
        </div>

        {/* 右カラム：アラート + クイックリンク */}
        <div className="space-y-4">
          {/* アラート */}
          <div className="rounded-xl border border-[#eaeaea] bg-white">
            <div className="border-b border-[#eaeaea] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#111]">アラート</h2>
              <p className="mt-0.5 text-xs text-[#888]">加算対象・算定日数終了間近</p>
            </div>
            <div className="space-y-2 p-4">
              {alerts.length === 0 ? (
                <p className="py-4 text-center text-xs text-[#888]">現在アラートはありません</p>
              ) : (
                alerts.slice(0, 6).map((a, i) => <AlertItem key={i} a={a} />)
              )}
              {alerts.length > 6 && (
                <Link
                  href="/patients"
                  className="block pt-1 text-center text-xs text-[#0070f3] hover:underline"
                >
                  他 {alerts.length - 6} 件を見る
                </Link>
              )}
            </div>
          </div>

          {/* クイックリンク */}
          <div className="rounded-xl border border-[#eaeaea] bg-white">
            <div className="border-b border-[#eaeaea] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#111]">クイックリンク</h2>
            </div>
            <div className="p-2">
              {[
                { href: "/schedule", label: "スケジュール", desc: "予約の確認・作成" },
                { href: "/patients", label: "患者一覧", desc: "患者情報の管理" },
                { href: "/records", label: "実施記録", desc: "記録の入力・確認" },
                { href: "/settings/staffs", label: "スタッフ管理", desc: "スタッフ登録・編集" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-[#fafafa]"
                >
                  <div>
                    <p className="text-sm font-medium text-[#111]">{item.label}</p>
                    <p className="text-xs text-[#888]">{item.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-[#888]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
