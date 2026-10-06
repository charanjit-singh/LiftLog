import { describe, it, expect } from 'vitest';
import { DayOfWeek, LocalDate, YearMonth } from '@js-joda/core';
import { selectStreak, selectTrackerMonth } from '@/store/tracking/derived';
import type { RootState } from '@/store/store';

const today = LocalDate.of(2026, 10, 10);

function state(overrides: {
  water?: { date: string; ml: number }[];
  smoking?: { date: string }[];
  food?: { date: string; calories: number }[];
  settings?: Record<string, unknown>;
}): RootState {
  return {
    tracking: {
      water: (overrides.water ?? []).map((x, i) => ({ id: `w${i}`, loggedAt: '', ...x })),
      smoking: (overrides.smoking ?? []).map((x, i) => ({ id: `s${i}`, loggedAt: '', ...x })),
      food: (overrides.food ?? []).map((x, i) => ({
        id: `f${i}`,
        loggedAt: '',
        meal: 'lunch',
        name: 'x',
        protein: 0,
        carbs: 0,
        fat: 0,
        ...x,
      })),
      savedFoods: [],
      isHydrated: true,
    },
    settings: {
      waterGoalMl: 2000,
      calorieGoal: 2000,
      smokingDailyLimit: 0,
      smokingTrackingSince: undefined,
      ...overrides.settings,
    },
  } as unknown as RootState;
}

describe('water streak', () => {
  it('counts days that reached the goal, ignoring an unfinished today', () => {
    const s = state({
      water: [
        { date: '2026-10-07', ml: 2500 },
        { date: '2026-10-08', ml: 2000 },
        { date: '2026-10-09', ml: 2100 },
        { date: '2026-10-10', ml: 300 },
      ],
    });

    expect(selectStreak(s, 'water', today)).toEqual({ current: 3, best: 3, todayMet: false });
  });

  it('is zero with no history', () => {
    expect(selectStreak(state({}), 'water', today).current).toBe(0);
  });
});

describe('food streak', () => {
  it('counts days with anything logged, regardless of calories', () => {
    const s = state({
      food: [
        { date: '2026-10-09', calories: 50 },
        { date: '2026-10-10', calories: 5000 },
      ],
    });

    expect(selectStreak(s, 'food', today).current).toBe(2);
  });
});

describe('smoking streak', () => {
  it('counts smoke-free days since tracking began', () => {
    const s = state({ settings: { smokingTrackingSince: '2026-10-05' } });

    expect(selectStreak(s, 'smoking', today)).toMatchObject({ current: 6, best: 6, todayMet: true });
  });

  it('resets as soon as a cigarette is logged today', () => {
    const s = state({ settings: { smokingTrackingSince: '2026-10-05' }, smoking: [{ date: '2026-10-10' }] });

    expect(selectStreak(s, 'smoking', today)).toMatchObject({ current: 0, best: 5, todayMet: false });
  });

  it('allows up to the daily limit when cutting down', () => {
    const s = state({
      settings: { smokingTrackingSince: '2026-10-08', smokingDailyLimit: 2 },
      smoking: [{ date: '2026-10-09' }, { date: '2026-10-09' }],
    });

    expect(selectStreak(s, 'smoking', today).current).toBe(3);
  });
});

describe('selectTrackerMonth', () => {
  const params = {
    kind: 'water' as const,
    yearMonth: YearMonth.of(2026, 10),
    today,
    firstDayOfWeek: DayOfWeek.MONDAY,
  };

  it('builds whole weeks padded with outside-month days', () => {
    const rows = selectTrackerMonth(state({}), params);

    expect(rows.every((row) => row.cells.length === 7)).toBe(true);
    expect(rows[0]!.cells[0]!.isOutsideFocus).toBe(true);
    expect(rows.flatMap((r) => r.cells).filter((c) => !c.isOutsideFocus)).toHaveLength(31);
  });

  it('grades days by progress, and leaves the future ungraded', () => {
    const s = state({
      water: [
        { date: '2026-10-01', ml: 2000 },
        { date: '2026-10-02', ml: 600 },
      ],
    });
    const cells = selectTrackerMonth(s, params)
      .flatMap((r) => r.cells)
      .filter((c) => !c.isOutsideFocus);

    expect(cells[0]!.level).toBe(4);
    expect(cells[1]!.level).toBe(1);
    expect(cells[2]!.level).toBe(0);
    expect(cells.find((c) => c.isToday)).toBeDefined();
    expect(cells.filter((c) => c.isFuture).every((c) => c.level === 0)).toBe(true);
  });

  it('marks smoke-free days best and over-limit days worst', () => {
    const s = state({
      settings: { smokingTrackingSince: '2026-10-01' },
      smoking: [{ date: '2026-10-03' }],
    });
    const cells = selectTrackerMonth(s, { ...params, kind: 'smoking' })
      .flatMap((r) => r.cells)
      .filter((c) => !c.isOutsideFocus);

    expect(cells[0]!.level).toBe(4);
    expect(cells[2]!.level).toBe(1);
  });
});
