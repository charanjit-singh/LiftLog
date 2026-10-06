import { LocalDate, LocalDateTime } from '@js-joda/core';
import { planGymReminders, TrackerReminderInput } from '@/models/gym-reminders';
import { nudgeMessages } from '@/models/gym-reminder-messages';
import { RootState } from '@/store/store';
import {
  setIsHydrated as setSettingsHydrated,
  setGymReminderHour,
  setGymReminderMissedDays,
  setGymReminders,
  setSmokingTrackingSince,
  setTrackFood,
  setTrackingReminders,
  setTrackSmoking,
  setTrackWater,
} from '@/store/settings';
import {
  deleteStoredSession,
  selectSessions,
  sessionFinished,
  setIsHydrated as setStoredSessionsHydrated,
  setStoredSessions,
} from '@/store/stored-sessions';
import { putMembership, removeMembership, setMembershipsHydrated } from '@/store/memberships';
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
import { selectStreak, selectWaterTotals } from '@/store/tracking/derived';
import { AddEffectFn } from '@/store/store';

/**
 * Anything that changes when the next reminder should fire: the settings, the memberships, the trackers,
 * and the workout history (a finished workout pushes the next nudge back, hydration brings it in).
 */
const replanTriggers = [
  setGymReminders,
  setGymReminderMissedDays,
  setGymReminderHour,
  setTrackingReminders,
  setTrackWater,
  setTrackFood,
  setTrackSmoking,
  setSmokingTrackingSince,
  putMembership,
  removeMembership,
  setMembershipsHydrated,
  setSettingsHydrated,
  setStoredSessionsHydrated,
  setStoredSessions,
  sessionFinished,
  deleteStoredSession,
  setTracking,
  setTrackingHydrated,
  putWaterEntry,
  removeWaterEntry,
  putFoodEntry,
  removeFoodEntry,
  putSmokeEntry,
  removeSmokeEntry,
];

export function applyGymReminderEffects(addEffect: AddEffectFn) {
  addEffect(replanTriggers, async (_, { cancelActiveListeners, getState, extra: { gymReminderService } }) => {
    // Several triggers can land together at startup; only the newest plan matters.
    cancelActiveListeners();
    const state = getState();
    // A plan made from half-loaded state would wipe reminders that are still right.
    if (
      !state.settings.isHydrated ||
      !state.storedSessions.isHydrated ||
      !state.memberships.isHydrated ||
      !state.tracking.isHydrated
    ) {
      return;
    }
    const { gymReminders, trackingReminders } = state.settings;
    if (!gymReminders && !trackingReminders) {
      await gymReminderService.replaceAll([]);
      return;
    }
    const today = LocalDate.now();
    const lastWorkoutDate = selectSessions(state).reduce<LocalDate | undefined>(
      (latest, session) => (!latest || session.date.isAfter(latest) ? session.date : latest),
      undefined,
    );
    // Each switch only turns off its own reminders: with no history and no memberships the planner has
    // nothing gym-related to schedule.
    await gymReminderService.replaceAll(
      planGymReminders({
        now: LocalDateTime.now(),
        lastWorkoutDate: gymReminders ? lastWorkoutDate : undefined,
        missedDays: state.settings.gymReminderMissedDays,
        hour: state.settings.gymReminderHour,
        memberships: gymReminders ? state.memberships.memberships : [],
        messageCount: nudgeMessages.length,
        trackers: trackingReminders ? trackerInput(state, today) : undefined,
      }),
    );
  });
}

function trackerInput(state: RootState, today: LocalDate): TrackerReminderInput {
  const { settings } = state;
  const streak = selectStreak(state, 'smoking', today);
  return {
    water: settings.trackWater
      ? { todayMet: (selectWaterTotals(state).get(today.toString()) ?? 0) >= settings.waterGoalMl }
      : undefined,
    food: settings.trackFood
      ? {
          todayEntries: state.tracking.food.filter((x) => x.date === today.toString()).length,
        }
      : undefined,
    smokeFree:
      settings.trackSmoking && streak.current > 0 ? { streakStart: today.minusDays(streak.current - 1) } : undefined,
  };
}
