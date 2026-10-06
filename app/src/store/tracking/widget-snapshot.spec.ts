import { describe, it, expect } from 'vitest';
import { LocalDate } from '@js-joda/core';
import { buildWidgetSnapshot, WidgetSnapshotState } from '@/store/tracking/widget-snapshot';

const today = LocalDate.of(2026, 10, 10);

const state = (settings: Record<string, unknown> = {}): WidgetSnapshotState =>
  ({
    tracking: {
      water: [
        { id: 'w1', date: '2026-10-09', ml: 2000, loggedAt: '' },
        { id: 'w2', date: '2026-10-10', ml: 500, loggedAt: '' },
        { id: 'w3', date: '2026-10-10', ml: 250, loggedAt: '' },
      ],
      smoking: [{ id: 's1', date: '2026-10-10', loggedAt: '' }],
      food: [
        {
          id: 'f1',
          date: '2026-10-10',
          calories: 640,
          meal: 'lunch',
          name: 'x',
          protein: 0,
          carbs: 0,
          fat: 0,
          loggedAt: '',
        },
      ],
      savedFoods: [],
      isHydrated: true,
    },
    settings: {
      useImperialUnits: false,
      trackWater: true,
      trackFood: true,
      trackSmoking: true,
      waterGoalMl: 2000,
      calorieGoal: 2200,
      smokingDailyLimit: 3,
      smokingTrackingSince: '2026-10-01',
      ...settings,
    },
  }) as unknown as WidgetSnapshotState;

describe('buildWidgetSnapshot', () => {
  it("sums today's totals and carries the goals", () => {
    expect(buildWidgetSnapshot(state(), today)).toMatchObject({
      day: '2026-10-10',
      waterMl: 750,
      waterGoalMl: 2000,
      kcal: 640,
      kcalGoal: 2200,
      cigarettes: 1,
      cigaretteLimit: 3,
    });
  });

  it('reports which trackers are switched on', () => {
    expect(buildWidgetSnapshot(state({ trackSmoking: false, trackFood: false }), today)).toMatchObject({
      water: true,
      food: false,
      smoking: false,
    });
  });

  it('offers a quick water amount in the chosen unit', () => {
    expect(buildWidgetSnapshot(state(), today).waterQuickMl).toBe(250);
    expect(buildWidgetSnapshot(state({ useImperialUnits: true }), today).waterQuickMl).toBe(355);
  });

  it('includes streaks', () => {
    expect(buildWidgetSnapshot(state(), today).waterStreak).toBe(1);
    expect(buildWidgetSnapshot(state({ smokingDailyLimit: 5 }), today).smokeFreeStreak).toBe(10);
  });
});
