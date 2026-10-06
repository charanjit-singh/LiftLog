import { Instant, LocalDate, LocalDateTime, ZoneId } from '@js-joda/core';

/**
 * What a home-screen widget shows. Flat on purpose: on iOS this is the widget's `props`, which the widget
 * process persists and merges, so nesting would make an optimistic update after a tap awkward.
 */
export interface WidgetSnapshot {
  /** The day the totals belong to (yyyy-MM-dd). A widget showing a past day shows zeros, not yesterday's totals. */
  day: string;
  imperial: boolean;

  water: boolean;
  waterMl: number;
  waterGoalMl: number;
  /** What one tap on the water button adds. */
  waterQuickMl: number;
  waterStreak: number;

  food: boolean;
  kcal: number;
  kcalGoal: number;
  foodStreak: number;

  smoking: boolean;
  cigarettes: number;
  cigaretteLimit: number;
  smokeFreeStreak: number;
}

/**
 * A tap on a widget that the app has not recorded yet.
 *
 * The iOS widget runs in its own process with no access to the app's database, so a tap is queued in the
 * widget's own persisted props and turned into real entries the next time the app runs. Carrying the time of
 * the tap keeps an entry on the day it was logged even if the app is not opened until the next morning.
 */
export interface PendingWidgetLog {
  kind: 'water' | 'smoking';
  /** Millilitres for water, ignored for smoking. */
  amount: number;
  /** Epoch milliseconds of the tap. */
  at: number;
}

export type WidgetLogEntry =
  | { kind: 'water'; id: string; date: string; ml: number; loggedAt: string }
  | { kind: 'smoking'; id: string; date: string; loggedAt: string };

/**
 * Turns queued taps into entries. Ids are derived from the tap, so applying the same queue twice (say the
 * app was killed before it could clear it) overwrites rather than duplicates.
 */
export function pendingLogsToEntries(
  pending: PendingWidgetLog[],
  zone: ZoneId = ZoneId.systemDefault(),
): WidgetLogEntry[] {
  return pending.flatMap((log): WidgetLogEntry[] => {
    if (!Number.isFinite(log.at) || (log.kind === 'water' && !(log.amount > 0))) {
      return [];
    }
    const instant = Instant.ofEpochMilli(log.at);
    const date = LocalDateTime.ofInstant(instant, zone).toLocalDate().toString();
    const id = `widget-${log.kind}-${log.at}`;
    return log.kind === 'water'
      ? [{ kind: 'water', id, date, ml: Math.round(log.amount), loggedAt: instant.toString() }]
      : [{ kind: 'smoking', id, date, loggedAt: instant.toString() }];
  });
}

/** The next local midnight, when a widget's totals roll over to a new day. */
export function nextMidnight(today: LocalDate, zone: ZoneId = ZoneId.systemDefault()): Date {
  return new Date(today.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli());
}

/** Strings the widget cannot translate itself - its process has no i18n - so the app supplies them. */
export interface WidgetLabels {
  water: string;
  food: string;
  smoking: string;
  logFood: string;
  smoked: string;
  empty: string;
}

/** The first snapshot of the next day: totals reset, goals and streaks carry over. */
export function snapshotForNextDay(snapshot: WidgetSnapshot, nextDay: LocalDate): WidgetSnapshot {
  return { ...snapshot, day: nextDay.toString(), waterMl: 0, kcal: 0, cigarettes: 0 };
}

/** Used until the app has run once and left its translated labels behind for the widget to read. */
export const defaultWidgetLabels: WidgetLabels = {
  water: 'Water',
  food: 'Food',
  smoking: 'Smoking',
  logFood: 'Log food',
  smoked: 'I smoked one',
  empty: 'Turn on a tracker in LiftLog settings',
};

/** Where the app leaves its translated labels for a widget that runs without the app (Android). */
export const widgetLabelsStorageKey = 'widgetLabels';

/** Fraction of a goal reached, for a progress bar. Never negative, never past full. */
export function barFraction(value: number, goal: number): number {
  if (!(goal > 0) || !(value > 0)) return 0;
  return Math.min(1, value / goal);
}
