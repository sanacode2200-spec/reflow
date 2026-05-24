export const ADDITION_OPTIONS = [
  { key: "early_rehab", label: "早期加算" },
  { key: "initial", label: "初期加算" },
  { key: "plan_eval", label: "総合計画評価料" },
  { key: "goal_support", label: "目標設定支援料" },
  { key: "predischarge_visit", label: "退院前訪問指導料" },
  { key: "discharge_rehab", label: "退院時リハビリ指導料" },
] as const;

export type AdditionKey = (typeof ADDITION_OPTIONS)[number]["key"];
