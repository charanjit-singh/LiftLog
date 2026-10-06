import { computeStreaks, DateKey, progressLevel, StreakResult, totalsByDate, TrackerKind } from '@/models/tracking';
import { ActivityCell, ActivityLevel, ActivityRow } from '@/store/activity/activity-types';
import { RootState } from '@/store/store';
import { selectFoodEntries, selectSmokeEntries, selectWaterEntries } from '@/store/tracking';
import { createSelector } from '@reduxjs/toolkit';
import { DayOfWeek, LocalDate, YearMonth } from '@js-joda/core';

const selectSettings = (state: Pick<RootState, 'settings'>) => state.settings;

export const selectWaterTotals = createSelector([selectWaterEntries], (e) => totalsByDate(e, (x) => x.ml));
export const selectSmokeTotals = createSelector([selectSmokeEntries], (e) => totalsByDate(e));
export const selectCalorieTotals = createSelector([selectFoodEntries], (e) => totalsByDate(e, (x) => x.calories));
/** How many food entries each day has - a day with any entry counts as logged. */
export const selectFoodEntryCounts = createSelector([selectFoodEntries], (e) => totalsByDate(e));

const earliest = (totals: Map<DateKey, number>): LocalDate | undefined => {
  const first = [...totals.keys()].sort()[0];
  return first ? LocalDate.parse(first) : undefined;
};

/** Everything a tracker's streak and calendar need to decide whether a given day was a good one. */
export interface DayRules {
  isMet: (date: LocalDate) => boolean;
  levelOf: (date: LocalDate) => ActivityLevel;
  countOf: (date: LocalDate) => number;
  from: LocalDate;
  todayBreaksStreak: boolean;
}

const selectToday = (_: unknown, kind: TrackerKind, today: LocalDate) => today;
const selectKind = (_: unknown, kind: TrackerKind) => kind;

export const selectDayRules = createSelector(
  [
    selectWaterTotals,
    selectSmokeTotals,
    selectCalorieTotals,
    selectFoodEntryCounts,
    selectSettings,
    selectKind,
    selectToday,
  ],
  (water, smoking, calories, foodCounts, settings, kind, today): DayRules => {
    const key = (date: LocalDate) => date.toString();
    switch (kind) {
      case 'water': {
        const goal = Math.max(1, settings.waterGoalMl);
        const ml = (d: LocalDate) => water.get(key(d)) ?? 0;
        return {
          isMet: (d) => ml(d) >= goal,
          levelOf: (d) => progressLevel(ml(d) / goal),
          countOf: ml,
          from: earliest(water) ?? today,
          todayBreaksStreak: false,
        };
      }
      case 'food': {
        const goal = Math.max(1, settings.calorieGoal);
        const kcal = (d: LocalDate) => calories.get(key(d)) ?? 0;
        const logged = (d: LocalDate) => (foodCounts.get(key(d)) ?? 0) > 0;
        return {
          isMet: logged,
          levelOf: (d) => (logged(d) ? (Math.max(1, progressLevel(kcal(d) / goal)) as ActivityLevel) : 0),
          countOf: kcal,
          from: earliest(foodCounts) ?? today,
          todayBreaksStreak: false,
        };
      }
      case 'smoking': {
        const count = (d: LocalDate) => smoking.get(key(d)) ?? 0;
        const limit = Math.max(0, settings.smokingDailyLimit);
        const since = settings.smokingTrackingSince ? LocalDate.parse(settings.smokingTrackingSince) : undefined;
        const from = since ?? earliest(smoking) ?? today;
        const isMet = (d: LocalDate) => !d.isBefore(from) && count(d) <= limit;
        return {
          isMet,
          // Before tracking began there is nothing to grade; after, smoke-free is best, over the limit worst.
          levelOf: (d) => (d.isBefore(from) ? 0 : count(d) === 0 ? 4 : count(d) <= limit ? 3 : 1),
          countOf: count,
          from,
          todayBreaksStreak: true,
        };
      }
    }
  },
);

export const selectStreak = createSelector([selectDayRules, selectToday], (rules, today): StreakResult =>
  computeStreaks({ isMet: rules.isMet, from: rules.from, today, todayBreaksStreak: rules.todayBreaksStreak }),
);

export interface TrackerMonthParams {
  kind: TrackerKind;
  yearMonth: YearMonth;
  today: LocalDate;
  firstDayOfWeek: DayOfWeek;
}

/** A month grid in the shape the shared activity calendar draws, graded by how the day went for this tracker. */
export const selectTrackerMonth = createSelector(
  [
    (state: RootState, params: TrackerMonthParams) => selectDayRules(state, params.kind, params.today),
    (_: RootState, params: TrackerMonthParams) => params,
  ],
  (rules, { yearMonth, today, firstDayOfWeek }): ActivityRow[] => {
    const firstOfMonth = yearMonth.atDay(1);
    const leadingDays = (firstOfMonth.dayOfWeek().value() - firstDayOfWeek.value() + 7) % 7;
    const trailingDays = (7 - ((leadingDays + yearMonth.lengthOfMonth()) % 7)) % 7;
    const totalDays = leadingDays + yearMonth.lengthOfMonth() + trailingDays;

    const cells: ActivityCell[] = Array.from({ length: totalDays }, (_, index) => {
      const date = firstOfMonth.plusDays(index - leadingDays);
      const isFuture = date.isAfter(today);
      return {
        date,
        level: isFuture ? 0 : rules.levelOf(date),
        sessionCount: isFuture ? 0 : rules.countOf(date),
        markers: [],
        overflowMarkers: 0,
        isToday: date.isEqual(today),
        isFuture,
        isOutsideFocus: index < leadingDays || index >= leadingDays + yearMonth.lengthOfMonth(),
        isBeyondFeedHorizon: false,
      };
    });
    return Array.from({ length: cells.length / 7 }, (_, week) => ({
      key: `week-${week}`,
      cells: cells.slice(week * 7, week * 7 + 7),
    }));
  },
);
