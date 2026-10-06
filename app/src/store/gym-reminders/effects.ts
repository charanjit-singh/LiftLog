import { LocalDate, LocalDateTime } from '@js-joda/core';
import { planGymReminders } from '@/models/gym-reminders';
import { nudgeMessages } from '@/models/gym-reminder-messages';
import {
  setIsHydrated as setSettingsHydrated,
  setGymReminderHour,
  setGymReminderMissedDays,
  setGymReminders,
} from '@/store/settings';
import {
  deleteStoredSession,
  selectSessions,
  sessionFinished,
  setIsHydrated as setStoredSessionsHydrated,
  setStoredSessions,
} from '@/store/stored-sessions';
import { putMembership, removeMembership, setMembershipsHydrated } from '@/store/memberships';
import { AddEffectFn } from '@/store/store';

/**
 * Anything that changes when the next reminder should fire: the settings, the memberships, and the
 * workout history (a finished workout pushes the next nudge back, hydration brings the history in).
 */
const replanTriggers = [
  setGymReminders,
  setGymReminderMissedDays,
  setGymReminderHour,
  putMembership,
  removeMembership,
  setMembershipsHydrated,
  setSettingsHydrated,
  setStoredSessionsHydrated,
  setStoredSessions,
  sessionFinished,
  deleteStoredSession,
];

export function applyGymReminderEffects(addEffect: AddEffectFn) {
  addEffect(replanTriggers, async (_, { cancelActiveListeners, getState, extra: { gymReminderService } }) => {
    // Several triggers can land together at startup; only the newest plan matters.
    cancelActiveListeners();
    const state = getState();
    // A plan made from half-loaded state would wipe reminders that are still right.
    if (!state.settings.isHydrated || !state.storedSessions.isHydrated || !state.memberships.isHydrated) {
      return;
    }
    if (!state.settings.gymReminders) {
      await gymReminderService.replaceAll([]);
      return;
    }
    const lastWorkoutDate = selectSessions(state).reduce<LocalDate | undefined>(
      (latest, session) => (!latest || session.date.isAfter(latest) ? session.date : latest),
      undefined,
    );
    await gymReminderService.replaceAll(
      planGymReminders({
        now: LocalDateTime.now(),
        lastWorkoutDate,
        missedDays: state.settings.gymReminderMissedDays,
        hour: state.settings.gymReminderHour,
        memberships: state.memberships.memberships,
        messageCount: nudgeMessages.length,
      }),
    );
  });
}
