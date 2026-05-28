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
import ReminderCard from "@/components/features/dashboard/reminder-card";
import { Calendar, Users, Bell, Clock, ChevronRight, CheckCircle, Sparkles } from "lucide-react";

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
    <div className={`glass-card p-5 ${accent ? "ring-primary/20 ring-1" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium">{label}</span>
        <span className="rounded-xl p-1.5" style={{ background: iconBg, color: iconColor }}>
          <Icon size={14} />
        </span>
      </div>
      <div className="flex items-end gap-1">
        <span
          className={`text-3xl font-bold tracking-tight ${accent && value > 0 ? "text-primary" : "text-foreground"}`}
        >
          {value}
        </span>
        <span className="text-muted-foreground mb-0.5 text-sm">{unit}</span>
      </div>
    </div>
  );
}

// ---- 週間単位数カード ----
function WeeklyUnitsCard({ units, limit }: { units: number; limit: number }) {
  const percent = limit > 0 ? Math.min(100, Math.round((units / limit) * 100)) : 0;
  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium">今週の単位数</span>
        <span className="rounded-xl bg-sky-400/14 p-1.5 text-sky-500">
          <Clock size={14} />
        </span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-foreground text-3xl font-bold tracking-tight">{units}</span>
        <span className="text-muted-foreground mb-0.5 text-sm">単位</span>
      </div>
      <div className="mt-4">
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className="to-primary h-full rounded-full bg-gradient-to-r from-sky-400 transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="text-muted-foreground mt-2 flex items-center justify-between text-[10px]">
          <span>月-日</span>
          <span>
            上限 {limit} 単位 · {percent}%
          </span>
        </div>
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
        <span className="text-muted-foreground text-xs font-medium">担当患者</span>
        <span
          className="rounded-xl p-1.5"
          style={{ background: "rgba(168,85,247,0.14)", color: "#a855f7" }}
        >
          <Icon size={14} />
        </span>
      </div>
      <div className="flex items-end gap-3">
        <div>
          <span className="text-foreground text-3xl font-bold tracking-tight">{outpatient}</span>
          <span className="text-muted-foreground ml-0.5 text-sm">名</span>
          <p className="text-muted-foreground mt-0.5 text-[10px]">外来</p>
        </div>
        <span className="text-border mb-4 text-lg">/</span>
        <div>
          <span className="text-foreground text-3xl font-bold tracking-tight">{inpatient}</span>
          <span className="text-muted-foreground ml-0.5 text-sm">名</span>
          <p className="text-muted-foreground mt-0.5 text-[10px]">入院</p>
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
            : "hover:bg-muted/40",
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
            cancelled ? "text-muted-foreground line-through" : "text-foreground font-medium",
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
                ? "text-muted-foreground decoration-border line-through"
                : "text-foreground font-medium",
            ].join(" ")}
          >
            {s.patient_name}
          </p>
        </div>
        <p className="text-muted-foreground mt-0.5 text-[11px] leading-none">
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
              <span className="bg-muted-foreground/35 h-1.5 w-1.5 rounded-full" />
              {upcomingLabel && (
                <span className="text-muted-foreground text-[10px] tabular-nums">
                  {upcomingLabel}
                </span>
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
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200/70 dark:border-indigo-800/50",
    icon: Sparkles,
    sublabel: "初期加算対象",
  },
  early_addition: {
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200/70 dark:border-indigo-800/50",
    icon: Bell,
    sublabel: "早期加算対象",
  },
  expiry_warning: {
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200/70 dark:border-indigo-800/50",
    icon: Clock,
    sublabel: "算定日数終了間近",
  },
} as const;

// ---- 今日の予約 + ステータス内訳カード ----
function TodayStatCard({ count, counts }: { count: number; counts: StatusCounts }) {
  const items = [
    {
      label: "予約",
      count: counts.scheduled,
      dot: "bg-muted-foreground/35",
      num: "text-muted-foreground",
    },
    { label: "保存中", count: counts.draft, dot: "bg-orange-400", num: "text-orange-500" },
    { label: "実施済み", count: counts.completed, dot: "bg-green-400", num: "text-green-600" },
    { label: "中止", count: counts.cancelled, dot: "bg-rose-400", num: "text-rose-500" },
  ];
  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium">今日の予約</span>
        <span className="bg-primary/10 text-primary rounded-xl p-1.5">
          <Calendar size={14} />
        </span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-foreground text-3xl font-bold tracking-tight">{count}</span>
        <span className="text-muted-foreground mb-0.5 text-sm">件</span>
      </div>
      <div className="border-border mt-4 flex flex-wrap gap-3 border-t pt-3">
        {items.map(({ label, count: c, dot, num }) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span className={`text-xs font-semibold tabular-nums ${num}`}>{c}</span>
            <span className="text-muted-foreground text-[10px]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertItem({ a }: { a: AlertRow }) {
  const cfg = ALERT_CONFIG[a.type];
  const Icon = cfg.icon;
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-white/10 ${cfg.color}`}
      >
        <Icon size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-medium ${cfg.color}`}>{cfg.sublabel}</p>
        <p className="text-foreground truncate text-sm font-medium">{a.patient_name}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${cfg.bg} ${cfg.color}`}
      >
        残{a.daysRemaining}日
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  const tenantId = await getTenantId();
  const { stats, statusCounts, todaySchedules, alerts, todayReminders } =
    await getDashboardData(tenantId);
  const today = new Date();

  const completedToday = todaySchedules.filter((s) => s.session_status === "completed").length;

  return (
    <div className="min-h-screen p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {format(today, "yyyy年M月d日（E）", { locale: ja })} · 今日の予約 {stats.todayCount} 件
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          {/* KPIカード */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TodayStatCard count={stats.todayCount} counts={statusCounts} />
            <WeeklyUnitsCard units={stats.weeklyUnits} limit={stats.weeklyUnitLimit} />
            <PatientStatCard
              icon={Users}
              outpatient={stats.outpatientCount}
              inpatient={stats.inpatientCount}
            />
            <StatCard
              label="要確認アラート"
              value={stats.alertCount}
              unit="件"
              icon={Bell}
              accent={stats.alertCount > 0}
              iconColor="#6366f1"
              iconBg="rgba(99,102,241,0.12)"
            />
          </div>

          {/* 今日のスケジュール */}
          <div className="glass-card overflow-hidden">
            <div className="border-border flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-foreground text-[13px] font-semibold tracking-tight">
                  今日のスケジュール
                </h2>
                {stats.todayCount > 0 && (
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {completedToday} / {stats.todayCount} 件実施済み
                  </p>
                )}
              </div>
              <Link
                href="/schedule"
                className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-[11px] transition-colors"
              >
                スケジュールへ
                <ChevronRight size={11} />
              </Link>
            </div>

            <div className="divide-border divide-y">
              {todaySchedules.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground text-[13px]">今日の予約はありません</p>
                  <Link
                    href="/schedule"
                    className="text-muted-foreground hover:text-foreground mt-2 inline-block text-[11px] transition-colors"
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

        {/* 右カラム：アラート + リマインダー */}
        <div className="space-y-4">
          <div className="glass-card overflow-hidden">
            <div className="border-border border-b px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-foreground text-sm font-semibold">要確認アラート</h2>
                  <p className="text-muted-foreground mt-0.5 text-xs">加算対象・算定日数終了間近</p>
                </div>
                <span className="bg-primary/10 text-primary rounded-xl p-1.5">
                  <Bell size={14} />
                </span>
              </div>
            </div>
            <div className="max-h-[244px] space-y-2 overflow-y-auto p-4">
              {alerts.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-xs">
                  現在アラートはありません
                </p>
              ) : (
                alerts.map((a, i) => <AlertItem key={`${a.patient_id}-${a.type}-${i}`} a={a} />)
              )}
            </div>
          </div>

          <ReminderCard tenantId={tenantId} reminders={todayReminders} />
        </div>
      </div>
    </div>
  );
}
