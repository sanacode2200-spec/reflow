import { differenceInDays, parseISO } from "date-fns";

export type AdditionAlert = {
  initial: boolean; // 初期加算対象（14日以内）
  early: boolean; // 早期加算対象（30日以内）
  initialDaysLeft: number;
  earlyDaysLeft: number;
};

export function checkAdditions(onsetDate: string, rehabStartDate: string): AdditionAlert {
  const onset = parseISO(onsetDate);
  const start = parseISO(rehabStartDate);
  const diff = differenceInDays(start, onset);

  const initialDaysLeft = Math.max(0, 14 - diff);
  const earlyDaysLeft = Math.max(0, 30 - diff);

  return {
    initial: diff >= 0 && diff <= 14,
    early: diff >= 0 && diff <= 30,
    initialDaysLeft,
    earlyDaysLeft,
  };
}
