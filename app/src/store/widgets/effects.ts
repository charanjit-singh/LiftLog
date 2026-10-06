import {
  setCalorieGoal,
  setIsHydrated as setSettingsHydrated,
  setSmokingDailyLimit,
  setSmokingTrackingSince,
  setTrackFood,
  setTrackSmoking,
  setTrackWater,
  setUseImperialUnits,
  setWaterGoalMl,
} from '@/store/settings';
import { AddEffectFn } from '@/store/store';
import {
  putFoodEntry,
  putSmokeEntry,
  putWaterEntry,
  removeFoodEntry,
  removeSmokeEntry,
  removeWaterEntry,
  setTracking,
  setTrackingHydrated,
} from '@/store/tracking';

/** Everything a widget displays: today's entries, which trackers are on, and the goals they are measured against. */
const refreshTriggers = [
  setTracking,
  setTrackingHydrated,
  putWaterEntry,
  removeWaterEntry,
  putFoodEntry,
  removeFoodEntry,
  putSmokeEntry,
  removeSmokeEntry,
  setSettingsHydrated,
  setTrackWater,
  setTrackFood,
  setTrackSmoking,
  setWaterGoalMl,
  setCalorieGoal,
  setSmokingDailyLimit,
  setSmokingTrackingSince,
  setUseImperialUnits,
];

export function applyWidgetEffects(addEffect: AddEffectFn) {
  addEffect(refreshTriggers, async (_, { getState, extra: { widgetService } }) => {
    const state = getState();
    if (!state.settings.isHydrated || !state.tracking.isHydrated) {
      return;
    }
    // Listening for the app coming to the foreground (and widget taps) only makes sense once data has loaded.
    widgetService.start();
    await widgetService.refresh();
  });
}
