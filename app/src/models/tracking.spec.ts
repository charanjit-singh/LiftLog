import { describe, it, expect } from 'vitest';
import { LocalDate } from '@js-joda/core';
import {
  computeStreaks,
  groupByDate,
  mealForHour,
  progressLevel,
  scaleMacros,
  sumMacros,
  totalsByDate,
  waterQuickAmounts,
} from '@/models/tracking';

const day = (n: number) => LocalDate.of(2026, 10, n);
const metOn = (...days: number[]) => {
  const keys = new Set(days.map((n) => day(n).toString()));
  return (date: LocalDate) => keys.has(date.toString());
};

describe('computeStreaks', () => {
  it('counts consecutive days ending today', () => {
    const result = computeStreaks({ isMet: metOn(4, 5, 6), from: day(1), today: day(6), todayBreaksStreak: false });

    expect(result).toEqual({ current: 3, best: 3, todayMet: true });
  });

  it('keeps a "do something" streak alive while today is still in progress', () => {
    const result = computeStreaks({ isMet: metOn(3, 4, 5), from: day(1), today: day(6), todayBreaksStreak: false });

    expect(result).toEqual({ current: 3, best: 3, todayMet: false });
  });

  it('breaks the streak once a full day has been missed', () => {
    const result = computeStreaks({ isMet: metOn(1, 2, 3, 5), from: day(1), today: day(6), todayBreaksStreak: false });

    expect(result.current).toBe(1);
    expect(result.best).toBe(3);
  });

  it('ends a "do not do something" streak the moment today goes wrong', () => {
    const result = computeStreaks({
      isMet: metOn(1, 2, 3, 4, 5),
      from: day(1),
      today: day(6),
      todayBreaksStreak: true,
    });

    expect(result).toEqual({ current: 0, best: 5, todayMet: false });
  });

  it('does not count days before tracking began', () => {
    const result = computeStreaks({ isMet: () => true, from: day(4), today: day(6), todayBreaksStreak: true });

    expect(result.current).toBe(3);
  });

  it('is empty when tracking starts in the future', () => {
    expect(computeStreaks({ isMet: () => true, from: day(8), today: day(6), todayBreaksStreak: false })).toEqual({
      current: 0,
      best: 0,
      todayMet: false,
    });
  });
});

describe('progressLevel', () => {
  it('grades from nothing up to goal met', () => {
    expect([0, 0.2, 0.6, 0.9, 1, 1.5].map(progressLevel)).toEqual([0, 1, 2, 3, 4, 4]);
  });
});

describe('macros', () => {
  it('sums entries', () => {
    expect(
      sumMacros([
        { calories: 100, protein: 5, carbs: 10, fat: 2 },
        { calories: 50, protein: 1, carbs: 3, fat: 0.5 },
      ]),
    ).toEqual({ calories: 150, protein: 6, carbs: 13, fat: 2.5 });
  });

  it('scales by servings with sensible rounding', () => {
    expect(scaleMacros({ calories: 101, protein: 3.33, carbs: 10, fat: 1 }, 1.5)).toEqual({
      calories: 152,
      protein: 5,
      carbs: 15,
      fat: 1.5,
    });
  });
});

describe('mealForHour', () => {
  it('picks a meal from the time of day', () => {
    expect([7, 12, 19, 23, 2].map(mealForHour)).toEqual(['breakfast', 'lunch', 'dinner', 'snack', 'snack']);
  });
});

describe('grouping', () => {
  const entries = [
    { date: '2026-10-01', ml: 250 },
    { date: '2026-10-01', ml: 500 },
    { date: '2026-10-02', ml: 100 },
  ];

  it('totals per date', () => {
    expect(totalsByDate(entries, (x) => x.ml).get('2026-10-01')).toBe(750);
    expect(totalsByDate(entries).get('2026-10-01')).toBe(2);
  });

  it('groups per date', () => {
    expect(groupByDate(entries).get('2026-10-01')).toHaveLength(2);
  });
});

describe('waterQuickAmounts', () => {
  it('offers round numbers in the chosen unit', () => {
    expect(waterQuickAmounts(false)).toEqual([150, 250, 500, 750]);
    expect(waterQuickAmounts(true)).toHaveLength(4);
  });
});
