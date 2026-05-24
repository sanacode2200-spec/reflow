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
    <div className="rounded-xl border border-[#eaeaea] bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-[#888]">担当患者</span>
        <span className="rounded-md bg-[#fafafa] p-1.5 text-[#888]">
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
          ? "bg-blue-500/[0.055] hover:bg-blue-500/[0.09]"
          : cancelled
            ? "opacity-[0.42]"
            : "hover:bg-black/[0.018]",
      ].join(" ")}
    >
      {/* 実施済み: 左2px青ライン */}
      {completed && (
        <div className="absolute inset-y-3 left-0 w-[2px] rounded-r-full bg-blue-400" />
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
            <CheckCircle size={11} className="shrink-0 text-blue-400" strokeWidth={2.5} />
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
  initial_addition: { color: "text-[#0070f3]", bg: "bg-[#f0f7ff]", border: "border-[#0070f3]/20" },
  early_addition: { color: "text-[#0070f3]", bg: "bg-[#f0f7ff]", border: "border-[#0070f3]/20" },
  expiry_warning: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
} as const;

// ---- 本日のステータス分布チャート ----
function StatusChart({ counts, className }: { counts: StatusCounts; className?: string }) {
  const total = counts.scheduled + counts.draft + counts.completed + counts.cancelled;
  const items = [
    {
      key: "scheduled",
      label: "予約",
      count: counts.scheduled,
      bg: "bg-[#E5E5E5]",
      text: "text-[#404040]",
    },
    {
      key: "draft",
      label: "一時保存",
      count: counts.draft,
      bg: "bg-[#f97316]",
      text: "text-white",
    },
    {
      key: "completed",
      label: "実施済み",
      count: counts.completed,
      bg: "bg-[#0070f3]",
      text: "text-white",
    },
    {
      key: "cancelled",
      label: "中止",
      count: counts.cancelled,
      bg: "bg-[#888]",
      text: "text-white",
    },
  ];

  return (
    <div className={`rounded-xl border border-[#eaeaea] bg-white p-5 ${className ?? ""}`}>
      <p className="mb-3 text-xs font-medium text-[#888]">本日の予約ステータス</p>

      {/* セグメントバー */}
      {total > 0 ? (
        <div className="mb-4 flex h-3 overflow-hidden rounded-full">
          {items.map(({ key, count, bg }) =>
            count > 0 ? (
              <div
                key={key}
                className={`${bg} transition-all`}
                style={{ width: `${(count / total) * 100}%` }}
              />
            ) : null
          )}
        </div>
      ) : (
        <div className="mb-4 h-3 rounded-full bg-[#F7F7F7]" />
      )}

      {/* 凡例 + 件数 */}
      <div className="flex gap-4">
        {items.map(({ key, label, count, bg, text }) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${bg} ${text}`}
            >
              {count}
            </span>
            <span className="text-xs text-[#888]">{label}</span>
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
    <div className="min-h-screen bg-[#fafafa] p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#111]">ダッシュボード</h1>
        <p className="mt-0.5 text-sm text-[#888]">
          {format(today, "yyyy年M月d日（E）", { locale: ja })}
        </p>
      </div>

      {/* KPIカード */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="今日の予約" value={stats.todayCount} unit="件" icon={Calendar} />
        <StatCard label="今月の単位数" value={stats.monthlyUnits} unit="単位" icon={Clock} />
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
        />
      </div>

      {/* 本日のステータス分布 */}
      <StatusChart counts={statusCounts} className="mb-6" />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 今日のスケジュール */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#ebebeb] bg-white">
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
