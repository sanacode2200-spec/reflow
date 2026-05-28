"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarPlus, ChevronRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { createReminder } from "@/lib/actions/reminder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Reminder = {
  id: string;
  title: string;
  reminder_at: Date;
};

type Props = {
  tenantId: string;
  reminders: Reminder[];
};

function defaultDateTimeValue() {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return format(nextHour, "yyyy-MM-dd'T'HH:mm");
}

export default function ReminderCard({ tenantId, reminders }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [reminderAt, setReminderAt] = useState(defaultDateTimeValue);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sortedReminders = useMemo(
    () =>
      [...reminders].sort(
        (a, b) => new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime()
      ),
    [reminders]
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setError(null);
      setReminderAt(defaultDateTimeValue());
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      await createReminder(tenantId, { title, reminder_at: reminderAt });
      setTitle("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "リマインダーの登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#7c5cff] via-[#8b5cf6] to-[#a855f7] p-5 text-white shadow-[0_18px_40px_rgba(124,92,255,0.28)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white/75">今日のリマインダー</p>
            <h2 className="mt-1 text-base font-bold tracking-tight">
              {sortedReminders.length > 0
                ? `${sortedReminders.length}件あります`
                : "予定を忘れずに"}
            </h2>
          </div>
          <span className="rounded-2xl bg-white/18 p-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]">
            <Bell size={16} />
          </span>
        </div>

        <div className="space-y-2">
          {sortedReminders.length === 0 ? (
            <p className="rounded-2xl bg-white/12 px-3 py-3 text-sm leading-relaxed text-white/82">
              今日メモしておきたい連絡や確認事項を登録できます。
            </p>
          ) : (
            sortedReminders.slice(0, 3).map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center gap-3 rounded-2xl bg-white/14 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
              >
                <Clock size={13} className="shrink-0 text-white/80" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{reminder.title}</p>
                  <p className="mt-0.5 text-[11px] text-white/65">
                    {format(new Date(reminder.reminder_at), "HH:mm")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-white/18 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/26"
        >
          <CalendarPlus size={13} />
          カレンダー
          <ChevronRight size={12} />
        </button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="border-border bg-popover/90 max-w-md shadow-[0_24px_60px_rgba(20,24,60,0.14)] ring-0 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>リマインダー登録</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>日時</Label>
              <Input
                type="datetime-local"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>内容</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 佐々木さんに自主トレ資料を渡す"
              />
            </div>
            {error && (
              <p className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="button" disabled={saving} onClick={handleSubmit}>
              {saving ? "登録中..." : "登録する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
