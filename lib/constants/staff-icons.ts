import { Star, Heart, Zap, Sun, Leaf, Flame, Shield, Gem, Moon, Cloud } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

export const STAFF_ICON_MAP: Record<StaffIconKey, LucideIcon> = {
  star: Star,
  heart: Heart,
  zap: Zap,
  sun: Sun,
  leaf: Leaf,
  flame: Flame,
  shield: Shield,
  gem: Gem,
  moon: Moon,
  cloud: Cloud,
};
