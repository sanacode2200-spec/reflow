import { getTenantId } from "@/lib/actions/schedule";
import {
  getDashboardData,
  type AlertRow,
  type TodayScheduleRow,
  type StatusCounts,
} from "@/lib/actions/dashboard";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";
import {
  Calendar,
  Users,
  Zap,
  AlertTriangle,
  Clock,
  ChevronRight,
  CheckCircle,
} from "lucide-react";

// ---- KPIカード ----
function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  accent,
  iconColor = "#6366f1",
  iconBg = "rgba(99,102,241,0.12)",
}: {
  label: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  accent?: boolean;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className={`glass-card p-5 ${accent ? "ring-1 ring-red-200" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-[#8a8fa3]">{label}</span>
        <span
          className="rounded-xl p-1.5"
          style={
            accent
              ? { background: "rgba(239,68,68,0.10)", color: "#ef4444" }
              : { background: iconBg, color: iconColor }
          }
        >
          <Icon size={14} />
        </span>
      </div>
      <div className="flex items-end gap-1">
        <span
          className={`text-3xl font-bold tracking-tight ${accent && value > 0 ? "text-red-500" : "text-[#1d1f2b]"}`}
        >
          {value}
        </span>
        <span className="mb-0.5 text-sm text-[#8a8fa3]">{unit}</span>
      </div>
    </div>
  );
}

// ---- 外来/入院 分割KPIカード ----
function PatientStatCard({
  icon: Icon,
  outpatient,
  inpatient,
}: {
  icon: React.ElementType;
  outpatient: number;
  inpatient: number;
}) {
  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-[#8a8fa3]">担当患者</span>
        <span
          className="rounded-xl p-1.5"
          style={{ background: "rgba(168,85,247,0.14)", color: "#a855f7" }}
        >
          <Icon size={14} />
        </span>
      </div>
      <div className="flex items-end gap-3">
        <div>
          <span className="text-3xl font-bold tracking-tight text-[#111]">{outpatient}</span>
          <span className="ml-0.5 text-sm text-[#888]">名</span>
          <p className="mt-0.5 text-[10px] text-[#888]">外来</p>
        </div>
        <span className="mb-4 text-lg text-[#d4d4d4]">/</span>
        <div>
          <span className="text-3xl font-bold tracking-tight text-[#111]">{inpatient}</span>
          <span className="ml-0.5 text-sm text-[#888]">名</span>
          <p className="mt-0.5 text-[10px] text-[#888]">入院</p>
        </div>
      </div>
    </div>
  );
}

// ---- 今日のスケジュール行 ----
function ScheduleRow({ s, now }: { s: TodayScheduleRow; now: Date }) {
  const cancelled = s.is_cancelled;
  const status = s.session_status;
  const startAt = new Date(s.start_at);
  const completed = !cancelled && status === "completed";
  const draft = !cancelled && status === "draft";

  // 残り時間ラベル（未来のみ・90分以内）
  const diffMin = Math.round((startAt.getTime() - now.getTime()) / 60000);
  const upcomingLabel =
    !completed && !draft && !cancelled && diffMin > 0 && diffMin <= 90
      ? diffMin < 60
        ? `${diffMin}分後`
        : `${Math.round(diffMin / 60)}時間後`
      : null;

  return (
    <div
      className={[
        "relative flex min-h-[76px] items-center gap-4 px-5",
        "transition-all duration-[180ms] ease-out",
        completed
          ? "bg-green-500/[0.055] hover:bg-green-500/[0.09]"
          : cancelled
            ? "opacity-[0.42]"
            : "hover:bg-black/[0.018]",
      ].join(" ")}
    >
      {/* 実施済み: 左2px青ライン */}
      {completed && (
        <div className="absolute inset-y-3 left-0 w-[2px] rounded-r-full bg-green-400" />
      )}

      {/* 時刻 */}
      <div className="w-11 shrink-0">
        <span
          className={[
            "block font-mono text-[13px] tabular-nums",
            cancelled ? "text-[#ccc] line-through" : "font-medium text-[#222]",
          ].join(" ")}
        >
          {format(startAt, "HH:mm")}
        </span>
      </div>

      {/* 患者名 + サブ情報 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {completed && (
            <CheckCircle size={11} className="shrink-0 text-green-500" strokeWidth={2.5} />
          )}
          <p
            className={[
              "truncate text-[13px] leading-snug",
              cancelled
                ? "text-[#bbb] line-through decoration-[#d8d8d8]"
                : "font-medium text-[#111]",
            ].join(" ")}
          >
            {s.patient_name}
          </p>
        </div>
        <p className="mt-0.5 text-[11px] leading-none text-[#aaa]">
          {s.therapist_name} · {s.therapist_occupation.toUpperCase()} · {s.units}単位
        </p>
      </div>

      {/* 右: ステータスインジケーター */}
      {!cancelled && (
        <div className="shrink-0">
          {draft ? (
            <span className="flex items-center gap-1.5 text-[11px] text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              保存中
            </span>
          ) : !completed ? (
            <div className="flex flex-col items-end gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e4e4e4]" />
              {upcomingLabel && (
                <span className="text-[10px] text-[#c0c0c0] tabular-nums">{upcomingLabel}</span>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ---- アラートバッジ ----
const ALERT_CONFIG = {
  initial_addition: {
    color: "text-[#6366f1]",
    bg: "bg-[#6366f1]/8",
    border: "border-[#6366f1]/20",
  },
  early_addition: { color: "text-[#6366f1]", bg: "bg-[#6366f1]/8", border: "border-[#6366f1]/20" },
  expiry_warning: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
} as const;

// ---- 今日の予約 + ステータス内訳カード ----
function TodayStatCard({ count, counts }: { count: number; counts: StatusCounts }) {
  const items = [
    { label: "予約", count: counts.scheduled, dot: "bg-[#d4d4d4]", num: "text-[#555]" },
    { label: "保存中", count: counts.draft, dot: "bg-orange-400", num: "text-orange-500" },
    { label: "実施済み", count: counts.completed, dot: "bg-green-400", num: "text-green-600" },
    { label: "中止", count: counts.cancelled, dot: "bg-rose-400", num: "text-rose-500" },
  ];
  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-[#8a8fa3]">今日の予約</span>
        <span className="rounded-xl bg-[#6366f1]/10 p-1.5 text-[#6366f1]">
          <Calendar size={14} />
        </span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold tracking-tight text-[#111]">{count}</span>
        <span className="mb-0.5 text-sm text-[#888]">件</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-[#f5f5f5] pt-3">
        {items.map(({ label, count: c, dot, num }) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span className={`text-xs font-semibold tabular-nums ${num}`}>{c}</span>
            <span className="text-[10px] text-[#bbb]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const { stats, statusCounts, todaySchedules, alerts } = await getDashboardData(tenantId);
  const today = new Date();

  const completedToday = todaySchedules.filter((s) => s.session_status === "completed").length;

  return (
    <div className="min-h-screen p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#111]">ダッシュボード</h1>
        <p className="mt-0.5 text-sm text-[#888]">
          {format(today, "yyyy年M月d日（E）", { locale: ja })}
        </p>
      </div>

      {/* KPIカード */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TodayStatCard count={stats.todayCount} counts={statusCounts} />
        <StatCard
          label="今月の単位数"
          value={stats.monthlyUnits}
          unit="単位"
          icon={Clock}
          iconColor="#0ea5e9"
          iconBg="rgba(14,165,233,0.14)"
        />
        <PatientStatCard
          icon={Users}
          outpatient={stats.outpatientCount}
          inpatient={stats.inpatientCount}
        />
        <StatCard
          label="要確認アラート"
          value={stats.alertCount}
          unit="件"
          icon={Zap}
          accent={stats.alertCount > 0}
          iconColor="#f59e0b"
          iconBg="rgba(245,158,11,0.14)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 今日のスケジュール */}
        <div>
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#f3f3f3] px-5 py-4">
              <div>
                <h2 className="text-[13px] font-semibold tracking-tight text-[#111]">
                  今日のスケジュール
                </h2>
                {stats.todayCount > 0 && (
                  <p className="mt-0.5 text-[11px] text-[#bbb]">
                    {completedToday} / {stats.todayCount} 件実施済み
                  </p>
                )}
              </div>
              <Link
                href="/schedule"
                className="flex items-center gap-0.5 text-[11px] text-[#aaa] transition-colors hover:text-[#555]"
              >
                スケジュールへ
                <ChevronRight size={11} />
              </Link>
            </div>

            <div className="divide-y divide-black/[0.04]">
              {todaySchedules.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[13px] text-[#ccc]">今日の予約はありません</p>
                  <Link
                    href="/schedule"
                    className="mt-2 inline-block text-[11px] text-[#aaa] transition-colors hover:text-[#555]"
                  >
                    予約を追加する
                  </Link>
                </div>
              ) : (
                todaySchedules.map((s) => <ScheduleRow key={s.id} s={s} now={today} />)
              )}
            </div>
          </div>
        </div>

        {/* 右カラム：アラート + クイックリンク */}
        <div className="space-y-4">
          {/* アラート */}
          <div className="glass-card overflow-hidden">
            <div className="border-b border-[rgba(20,24,60,0.06)] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#1d1f2b]">アラート</h2>
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
                  className="block pt-1 text-center text-xs text-[#6366f1] hover:underline"
                >
                  他 {alerts.length - 6} 件を見る
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
