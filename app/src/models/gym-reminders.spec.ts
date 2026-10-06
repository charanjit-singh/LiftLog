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

describe('tracker reminders', () => {
  const trackerPlan = (trackers: GymReminderPlanInput['trackers'], overrides: Partial<GymReminderPlanInput> = {}) =>
    plan({ lastWorkoutDate: undefined, trackers, ...overrides });
  const ofKind = (reminders: ReturnType<typeof plan>, kind: string) => reminders.filter((x) => x.kind === kind);

  it('plans nothing when no tracker is enabled', () => {
    expect(trackerPlan({})).toEqual([]);
    expect(trackerPlan(undefined)).toEqual([]);
  });

  it('reminds about water every afternoon, but not today once the goal is met', () => {
    const open = ofKind(trackerPlan({ water: { todayMet: false } }), 'water');
    const met = ofKind(trackerPlan({ water: { todayMet: true } }), 'water');

    expect(open[0]!.at).toEqual(LocalDateTime.of(2026, 10, 6, 15, 0));
    expect(met[0]!.at).toEqual(LocalDateTime.of(2026, 10, 7, 15, 0));
    expect(open).toHaveLength(14);
  });

  it('skips the food reminder today when dinner is probably logged', () => {
    const sparse = ofKind(trackerPlan({ food: { todayEntries: 1 } }), 'food');
    const full = ofKind(trackerPlan({ food: { todayEntries: 3 } }), 'food');

    expect(sparse[0]!.at.toLocalDate().toString()).toBe('2026-10-06');
    expect(full[0]!.at.toLocalDate().toString()).toBe('2026-10-07');
  });

  it('celebrates smoke-free milestones the morning after they are reached', () => {
    // Streak began 5 Oct, so it was 2 days old on the 6th: 3 days is complete at the end of the 7th.
    const reminders = ofKind(
      trackerPlan({ smokeFree: { streakStart: LocalDate.of(2026, 10, 5) } }),
      'smokeFreeMilestone',
    );

    expect(reminders.map((x) => [x.at.toString(), 'days' in x ? x.days : 0]).slice(0, 3)).toEqual([
      ['2026-10-08T09:00', 3],
      ['2026-10-12T09:00', 7],
      ['2026-10-19T09:00', 14],
    ]);
  });

  it('never exceeds the iOS pending notification limit, keeping the nearest', () => {
    const reminders = plan({
      lastWorkoutDate: LocalDate.of(2026, 10, 1),
      memberships: Array.from({ length: 30 }, (_, i) => ({
        id: `m${i}`,
        name: 'Gym',
        startDate: '2026-01-01',
        endDate: `2026-10-${10 + (i % 15)}`,
        notes: '',
      })),
      trackers: {
        water: { todayMet: false },
        food: { todayEntries: 0 },
        smokeFree: { streakStart: LocalDate.of(2026, 10, 1) },
      },
    });

    expect(reminders.length).toBeLessThanOrEqual(60);
    const times = reminders.map((x) => x.at.toString());
    expect(times).toEqual([...times].sort());
  });
});
