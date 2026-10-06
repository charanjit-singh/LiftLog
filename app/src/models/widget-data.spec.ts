import { describe, it, expect } from 'vitest';
import { LocalDate, LocalDateTime, ZoneOffset } from '@js-joda/core';
import {
  barFraction,
  nextMidnight,
  pendingLogsToEntries,
  snapshotForNextDay,
  WidgetSnapshot,
} from '@/models/widget-data';

const zone = ZoneOffset.ofHours(1);
const at = (y: number, mo: number, d: number, h: number, mi = 0) =>
  LocalDateTime.of(y, mo, d, h, mi).atZone(zone).toInstant().toEpochMilli();

describe('pendingLogsToEntries', () => {
  it('turns each tap into an entry on the day it was tapped', () => {
    const entries = pendingLogsToEntries(
      [
        { kind: 'water', amount: 250, at: at(2026, 10, 5, 23, 30) },
        { kind: 'smoking', amount: 0, at: at(2026, 10, 6, 0, 15) },
      ],
      zone,
    );

    expect(entries.map((x) => [x.kind, x.date])).toEqual([
      ['water', '2026-10-05'],
      ['smoking', '2026-10-06'],
    ]);
    expect(entries[0]).toMatchObject({ ml: 250 });
  });

  it('derives stable ids so replaying a queue cannot duplicate entries', () => {
    const log = { kind: 'water' as const, amount: 250, at: at(2026, 10, 5, 9) };

    expect(pendingLogsToEntries([log], zone)[0]!.id).toBe(pendingLogsToEntries([log], zone)[0]!.id);
  });

  it('keeps two taps in the same minute apart', () => {
    const base = at(2026, 10, 5, 9);
    const entries = pendingLogsToEntries(
      [
        { kind: 'smoking', amount: 0, at: base },
        { kind: 'smoking', amount: 0, at: base + 1500 },
      ],
      zone,
    );

    expect(new Set(entries.map((x) => x.id)).size).toBe(2);
  });

  it('drops malformed taps instead of logging nonsense', () => {
    expect(
      pendingLogsToEntries(
        [
          { kind: 'water', amount: 0, at: at(2026, 10, 5, 9) },
          { kind: 'water', amount: -5, at: at(2026, 10, 5, 9) },
          { kind: 'water', amount: 250, at: Number.NaN },
        ],
        zone,
      ),
    ).toEqual([]);
  });
});

describe('nextMidnight', () => {
  it('is the start of the following local day', () => {
    const midnight = nextMidnight(LocalDate.of(2026, 10, 5), zone);

    expect(midnight.getTime()).toBe(at(2026, 10, 6, 0));
  });
});

describe('snapshotForNextDay', () => {
  it('resets the totals but keeps goals and streaks', () => {
    const today: WidgetSnapshot = {
      day: '2026-10-05',
      imperial: false,
      water: true,
      waterMl: 1800,
      waterGoalMl: 2000,
      waterQuickMl: 250,
      waterStreak: 4,
      food: true,
      kcal: 1500,
      kcalGoal: 2000,
      foodStreak: 9,
      smoking: true,
      cigarettes: 2,
      cigaretteLimit: 3,
      smokeFreeStreak: 0,
    };

    expect(snapshotForNextDay(today, LocalDate.of(2026, 10, 6))).toEqual({
      ...today,
      day: '2026-10-06',
      waterMl: 0,
      kcal: 0,
      cigarettes: 0,
    });
  });
});

describe('barFraction', () => {
  it('is clamped between empty and full', () => {
    expect([
      barFraction(0, 10),
      barFraction(5, 10),
      barFraction(30, 10),
      barFraction(-1, 10),
      barFraction(5, 0),
    ]).toEqual([0, 0.5, 1, 0, 0]);
  });
});
