import { ChronoUnit, LocalDate } from '@js-joda/core';

export type TrackerKind = 'water' | 'food' | 'smoking';

/** ISO local date, `yyyy-MM-dd`. Entries are bucketed by the day the user means, not by timestamp. */
export type DateKey = string;

export interface WaterEntry {
  id: string;
  date: DateKey;
  ml: number;
  loggedAt: string;
}

export interface SmokeEntry {
  id: string;
  date: DateKey;
  loggedAt: string;
}

export const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof mealTypes)[number];

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodEntry extends Macros {
  id: string;
  date: DateKey;
  meal: MealType;
  name: string;
  loggedAt: string;
}

/** A food the user can log again in one tap. Built automatically from what they have eaten. */
export interface SavedFood extends Macros {
  id: string;
  name: string;
  lastUsedAt: string;
  useCount: number;
}

export const emptyMacros: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export function scaleMacros(macros: Macros, servings: number): Macros {
  return {
    calories: Math.round(macros.calories * servings),
    protein: Math.round(macros.protein * servings * 10) / 10,
    carbs: Math.round(macros.carbs * servings * 10) / 10,
    fat: Math.round(macros.fat * servings * 10) / 10,
  };
}

export function sumMacros(entries: Macros[]): Macros {
  return entries.reduce(addMacros, emptyMacros);
}

/** Breakfast until mid-morning, then lunch, dinner, and snacks late at night - so the user rarely has to choose. */
export function mealForHour(hour: number): MealType {
  if (hour >= 4 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'snack';
}

export function totalsByDate<T extends { date: DateKey }>(
  entries: T[],
  valueOf: (entry: T) => number = () => 1,
): Map<DateKey, number> {
  const totals = new Map<DateKey, number>();
  for (const entry of entries) {
    totals.set(entry.date, (totals.get(entry.date) ?? 0) + valueOf(entry));
  }
  return totals;
}

export function groupByDate<T extends { date: DateKey }>(entries: T[]): Map<DateKey, T[]> {
  const groups = new Map<DateKey, T[]>();
  for (const entry of entries) {
    const group = groups.get(entry.date);
    if (group) {
      group.push(entry);
    } else {
      groups.set(entry.date, [entry]);
    }
  }
  return groups;
}

export interface StreakResult {
  current: number;
  best: number;
  /** Whether today already counts. Lets the UI say "keep it going" rather than showing a broken streak. */
  todayMet: boolean;
}

/**
 * Consecutive days that met a goal, up to today.
 *
 * `todayBreaksStreak` decides what an unmet today means. For "do something" goals (drink water, log
 * food) the day is still in progress, so the streak holds until midnight. For "don't do something" goals
 * (smoking) an unmet today cannot be undone, so it ends the streak straight away.
 */
export function computeStreaks(input: {
  isMet: (date: LocalDate) => boolean;
  /** The first day that counts. Days before tracking began are neither met nor missed. */
  from: LocalDate;
  today: LocalDate;
  todayBreaksStreak: boolean;
}): StreakResult {
  const { isMet, from, today, todayBreaksStreak } = input;
  if (today.isBefore(from)) {
    return { current: 0, best: 0, todayMet: false };
  }
  const todayMet = isMet(today);

  let best = 0;
  let run = 0;
  const days = from.until(today, ChronoUnit.DAYS);
  for (let offset = 0; offset <= days; offset++) {
    const date = from.plusDays(offset);
    const isToday = offset === days;
    if (isMet(date)) {
      run++;
      best = Math.max(best, run);
    } else if (!isToday || todayBreaksStreak) {
      run = 0;
    }
  }
  // `run` has just walked through today: if today is unmet and in progress it is still the streak so far.
  return { current: run, best, todayMet };
}

/** Maps how far through a goal a day got onto the calendar's 0-4 intensity ramp. */
export function progressLevel(progress: number): 0 | 1 | 2 | 3 | 4 {
  if (progress <= 0) return 0;
  if (progress < 0.5) return 1;
  if (progress < 0.85) return 2;
  if (progress < 1) return 3;
  return 4;
}

export type WaterUnit = 'ml' | 'oz';

const mlPerOunce = 29.5735;

export function formatWater(ml: number, imperial: boolean): string {
  return imperial ? `${Math.round(ml / mlPerOunce)} oz` : `${Math.round(ml)} ml`;
}

/** Quick-add sizes, chosen to be round numbers in whichever unit the user thinks in. */
export function waterQuickAmounts(imperial: boolean): number[] {
  return imperial ? [8, 12, 16, 24].map((oz) => Math.round(oz * mlPerOunce)) : [150, 250, 500, 750];
}

/** What a day's smoking is worth in money, given what one cigarette costs. */
export function smokingSpend(count: number, cigarettePriceCents: number): number {
  return (count * cigarettePriceCents) / 100;
}
