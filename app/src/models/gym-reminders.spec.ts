import { describe, it, expect } from 'vitest';
import { LocalDate, LocalDateTime } from '@js-joda/core';
import { GymReminderPlanInput, planGymReminders } from '@/models/gym-reminders';
import { GymMembership } from '@/models/membership';

// Tuesday 6 October 2026, 09:00
const now = LocalDateTime.of(2026, 10, 6, 9, 0);

const plan = (overrides: Partial<GymReminderPlanInput> = {}) =>
  planGymReminders({
    now,
    lastWorkoutDate: LocalDate.of(2026, 10, 6),
    missedDays: 2,
    hour: 18,
    memberships: [],
    messageCount: 10,
    ...overrides,
  });

const dates = (reminders: ReturnType<typeof plan>) => reminders.map((x) => x.at.toLocalDate().toString());

describe('missed workout nudges', () => {
  it('starts the nudges once the configured number of days have passed', () => {
    const reminders = plan({ lastWorkoutDate: LocalDate.of(2026, 10, 6), missedDays: 2 });

    expect(dates(reminders)[0]).toBe('2026-10-08');
    expect(reminders[0]).toMatchObject({ kind: 'missed', daysSince: 2 });
  });

  it('nudges today if the reminder time is still ahead and the gap is already long enough', () => {
    const reminders = plan({ lastWorkoutDate: LocalDate.of(2026, 10, 4) });

    expect(dates(reminders)[0]).toBe('2026-10-06');
  });

  it("skips today's reminder once its time has passed", () => {
    const reminders = plan({ now: LocalDateTime.of(2026, 10, 6, 18, 0), lastWorkoutDate: LocalDate.of(2026, 10, 4) });

    expect(dates(reminders)[0]).toBe('2026-10-07');
  });

  it('stops nagging a week after the nudges begin', () => {
    const reminders = plan({ lastWorkoutDate: LocalDate.of(2026, 9, 1) });

    expect(reminders).toEqual([]);
  });

  it('keeps nudging daily through the overdue window', () => {
    const reminders = plan({ lastWorkoutDate: LocalDate.of(2026, 10, 4), missedDays: 2 });

    expect(dates(reminders)).toEqual([
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
    ]);
  });

  it('never nudges someone with no history', () => {
    expect(plan({ lastWorkoutDate: undefined })).toEqual([]);
  });

  it('uses the same message for the same date and stays inside the message list', () => {
    const first = plan({ lastWorkoutDate: LocalDate.of(2026, 10, 4) });
    const second = plan({ lastWorkoutDate: LocalDate.of(2026, 10, 4) });

    expect(first).toEqual(second);
    for (const reminder of first) {
      if (reminder.kind === 'missed') {
        expect(reminder.messageIndex).toBeGreaterThanOrEqual(0);
        expect(reminder.messageIndex).toBeLessThan(10);
      }
    }
  });

  it('schedules at the chosen hour', () => {
    expect(
      plan({ hour: 7, now: LocalDateTime.of(2026, 10, 6, 6, 0), lastWorkoutDate: LocalDate.of(2026, 10, 4) })[0]!.at,
    ).toEqual(LocalDateTime.of(2026, 10, 6, 7, 0));
  });
});

describe('membership ending reminders', () => {
  const membership = (endDate: string | undefined): GymMembership => ({
    id: 'm1',
    name: 'City Gym',
    startDate: '2026-01-01',
    endDate,
    notes: '',
  });

  it('warns three days ahead and again on the last day', () => {
    const reminders = plan({ lastWorkoutDate: undefined, memberships: [membership('2026-10-20')] });

    expect(reminders.map((x) => [x.at.toLocalDate().toString(), 'daysLeft' in x ? x.daysLeft : -1])).toEqual([
      ['2026-10-17', 3],
      ['2026-10-20', 0],
    ]);
  });

  it('ignores ongoing memberships and ones that have already ended', () => {
    expect(
      plan({ lastWorkoutDate: undefined, memberships: [membership(undefined), membership('2026-09-01')] }),
    ).toEqual([]);
  });

  it('drops the early warning when the membership is about to end anyway', () => {
    const reminders = plan({ lastWorkoutDate: undefined, memberships: [membership('2026-10-07')] });

    expect(dates(reminders)).toEqual(['2026-10-07']);
  });
});

describe('ordering', () => {
  it('returns reminders in time order across kinds', () => {
    const reminders = plan({
      lastWorkoutDate: LocalDate.of(2026, 10, 4),
      memberships: [{ id: 'm', name: 'Gym', startDate: '2026-01-01', endDate: '2026-10-09', notes: '' }],
    });

    const times = reminders.map((x) => x.at.toString());
    expect(times).toEqual([...times].sort());
  });
});
