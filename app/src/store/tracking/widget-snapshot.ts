import { waterQuickAmounts } from '@/models/tracking';
import { WidgetSnapshot } from '@/models/widget-data';
import { RootState } from '@/store/store';
import { selectCalorieTotals, selectSmokeTotals, selectStreak, selectWaterTotals } from '@/store/tracking/derived';
import { LocalDate } from '@js-joda/core';

/** Only these two slices are read, so the Android headless handler can build state from the database directly. */
export type WidgetSnapshotState = Pick<RootState, 'tracking' | 'settings'>;

export function buildWidgetSnapshot(state: WidgetSnapshotState, today: LocalDate): WidgetSnapshot {
  const { settings } = state;
  const day = today.toString();
  return {
    day,
    imperial: settings.useImperialUnits,

    water: settings.trackWater,
    waterMl: selectWaterTotals(state).get(day) ?? 0,
    waterGoalMl: settings.waterGoalMl,
    waterQuickMl: waterQuickAmounts(settings.useImperialUnits)[1]!,
    waterStreak: selectStreak(state, 'water', today).current,

    food: settings.trackFood,
    kcal: selectCalorieTotals(state).get(day) ?? 0,
    kcalGoal: settings.calorieGoal,
    foodStreak: selectStreak(state, 'food', today).current,

    smoking: settings.trackSmoking,
    cigarettes: selectSmokeTotals(state).get(day) ?? 0,
    cigaretteLimit: settings.smokingDailyLimit,
    smokeFreeStreak: selectStreak(state, 'smoking', today).current,
  };
}
