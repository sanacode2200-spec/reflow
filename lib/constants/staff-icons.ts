export const STAFF_ICON_KEYS = [
  "star",
  "heart",
  "zap",
  "sun",
  "leaf",
  "flame",
  "shield",
  "gem",
  "moon",
  "cloud",
] as const;

export type StaffIconKey = (typeof STAFF_ICON_KEYS)[number];
