"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ScheduleWithRelations } from "@/lib/actions/schedule";

type Props = {
  scheduleId: string | null;
  schedules: ScheduleWithRelations[];
  onClose: () => void;
};

export default function SchedulePanel({ scheduleId, schedules, onClose }: Props) {
  const schedule = schedules.find((s) => s.id === scheduleId) ?? null;

  return (
    <AnimatePresence>
      {scheduleId && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="border-border bg-popover text-popover-foreground fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col border-l shadow-xl"
          >
            <div className="border-border flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-foreground text-base font-semibold">
                {schedule ? schedule.patient_name : "予約詳細"}
              </h2>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {schedule ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">患者</span>
                    <p className="text-foreground font-medium">{schedule.patient_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">担当</span>
                    <p className="text-foreground font-medium">{schedule.therapist_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">時間</span>
                    <p className="text-foreground font-medium">
                      {schedule.start_at.toLocaleTimeString("ja", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {schedule.end_at.toLocaleTimeString("ja", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">単位数</span>
                    <p className="text-foreground font-medium">{schedule.units}単位</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">予約が見つかりません。</p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
