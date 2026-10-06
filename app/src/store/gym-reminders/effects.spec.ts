import { describe, it, expect, vi } from 'vitest';
import { LocalDate } from '@js-joda/core';
import { PlannedGymReminder } from '@/models/gym-reminders';
import { setGymReminders } from '@/store/settings';
import { sessionFinished } from '@/store/stored-sessions';
import { applyGymReminderEffects } from '@/store/gym-reminders/effects';
import { createAddEffectTestBed } from '@/utils/__test__/add-effect-testbed';

function setup(state: { gymReminders: boolean; hydrated?: boolean; sessionDate?: LocalDate }) {
  const replaceAll = vi.fn<(reminders: PlannedGymReminder[]) => Promise<void>>().mockResolvedValue();
  const hydrated = state.hydrated ?? true;
  const sessions = state.sessionDate ? { s1: { id: 's1', date: state.sessionDate } } : {};
  const testBed = createAddEffectTestBed({
    initialState: {
      settings: {
        isHydrated: hydrated,
        gymReminders: state.gymReminders,
        gymReminderMissedDays: 2,
        gymReminderHour: 18,
      },
      storedSessions: { isHydrated: hydrated, sessions, activeSessionId: undefined },
      memberships: { isHydrated: hydrated, memberships: [] },
    },
    services: { gymReminderService: { replaceAll } },
  });
  applyGymReminderEffects(testBed.addEffect);
  return { testBed, replaceAll };
}

describe('gym reminder effects', () => {
  it('clears every scheduled reminder when the feature is off', async () => {
    const { testBed, replaceAll } = setup({ gymReminders: false });

    await testBed.dispatchHandled(setGymReminders(false));

    expect(replaceAll).toHaveBeenCalledWith([]);
  });

  it('does nothing until everything has loaded, so a half-loaded state cannot wipe good reminders', async () => {
    const { testBed, replaceAll } = setup({ gymReminders: true, hydrated: false });

    await testBed.dispatchHandled(setGymReminders(true));

    expect(replaceAll).not.toHaveBeenCalled();
  });

  it('plans from the most recent finished workout', async () => {
    const longAgo = LocalDate.now().minusDays(3);
    const { testBed, replaceAll } = setup({ gymReminders: true, sessionDate: longAgo });

    await testBed.dispatchHandled(sessionFinished('s1'));

    expect(replaceAll).toHaveBeenCalledTimes(1);
    const planned = replaceAll.mock.calls[0]![0];
    expect(planned.length).toBeGreaterThan(0);
    expect(planned.every((x) => x.kind === 'missed')).toBe(true);
  });
});
