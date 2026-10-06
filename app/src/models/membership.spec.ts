import { describe, it, expect } from 'vitest';
import { LocalDate } from '@js-joda/core';
import {
  GymMembership,
  membershipDatesAreValid,
  membershipDaysRemaining,
  membershipStatus,
  sortMemberships,
} from '@/models/membership';

const today = LocalDate.of(2026, 10, 6);
const make = (startDate: string, endDate?: string): GymMembership => ({
  id: startDate,
  name: 'Gym',
  startDate,
  endDate,
  notes: '',
});

describe('membershipStatus', () => {
  it('is upcoming before the start date', () => {
    expect(membershipStatus(make('2026-10-07'), today)).toBe('upcoming');
  });

  it('is active on the start and end dates themselves', () => {
    expect(membershipStatus(make('2026-10-06', '2026-12-01'), today)).toBe('active');
    expect(membershipStatus(make('2026-01-01', '2026-10-06'), today)).toBe('active');
  });

  it('is active with no end date', () => {
    expect(membershipStatus(make('2020-01-01'), today)).toBe('active');
  });

  it('has ended the day after the end date', () => {
    expect(membershipStatus(make('2026-01-01', '2026-10-05'), today)).toBe('ended');
  });
});

describe('membershipDaysRemaining', () => {
  it('counts today, so the last day has one day left', () => {
    expect(membershipDaysRemaining(make('2026-01-01', '2026-10-06'), today)).toBe(1);
    expect(membershipDaysRemaining(make('2026-01-01', '2026-10-16'), today)).toBe(11);
  });

  it('is undefined when ongoing or ended', () => {
    expect(membershipDaysRemaining(make('2026-01-01'), today)).toBeUndefined();
    expect(membershipDaysRemaining(make('2026-01-01', '2026-10-05'), today)).toBeUndefined();
  });
});

describe('membershipDatesAreValid', () => {
  it('rejects an end date before the start date', () => {
    expect(membershipDatesAreValid(make('2026-10-06', '2026-10-05'))).toBe(false);
  });

  it('allows a same-day or open-ended membership', () => {
    expect(membershipDatesAreValid(make('2026-10-06', '2026-10-06'))).toBe(true);
    expect(membershipDatesAreValid(make('2026-10-06'))).toBe(true);
  });
});

describe('sortMemberships', () => {
  it('puts the newest start first without mutating the input', () => {
    const input = [make('2024-01-01'), make('2026-01-01'), make('2025-01-01')];
    expect(sortMemberships(input).map((x) => x.startDate)).toEqual(['2026-01-01', '2025-01-01', '2024-01-01']);
    expect(input[0]!.startDate).toBe('2024-01-01');
  });
});
