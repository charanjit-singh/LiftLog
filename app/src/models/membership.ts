import { ChronoUnit, LocalDate } from '@js-joda/core';

export type MembershipId = string;

/**
 * A period of gym membership. Dates are ISO local dates (`yyyy-MM-dd`) so they survive storage and
 * serialization without a timezone. No `endDate` means the membership is ongoing.
 */
export interface GymMembership {
  id: MembershipId;
  name: string;
  startDate: string;
  endDate: string | undefined;
  notes: string;
}

export type MembershipStatus = 'upcoming' | 'active' | 'ended';

export function membershipStatus(membership: GymMembership, today: LocalDate): MembershipStatus {
  if (LocalDate.parse(membership.startDate).isAfter(today)) {
    return 'upcoming';
  }
  if (membership.endDate && LocalDate.parse(membership.endDate).isBefore(today)) {
    return 'ended';
  }
  return 'active';
}

/** An end date before the start date describes no period at all. */
export function membershipDatesAreValid(membership: Pick<GymMembership, 'startDate' | 'endDate'>): boolean {
  return !membership.endDate || !LocalDate.parse(membership.endDate).isBefore(LocalDate.parse(membership.startDate));
}

/** Whole days left, counting today. Undefined for an ongoing or already-ended membership. */
export function membershipDaysRemaining(membership: GymMembership, today: LocalDate): number | undefined {
  if (!membership.endDate) {
    return undefined;
  }
  const days = today.until(LocalDate.parse(membership.endDate), ChronoUnit.DAYS);
  return days < 0 ? undefined : days + 1;
}

/** Newest start first, so the current membership leads the list. */
export function sortMemberships(memberships: GymMembership[]): GymMembership[] {
  return [...memberships].sort((a, b) => b.startDate.localeCompare(a.startDate));
}
