import { ChronoUnit, LocalDate, LocalDateTime, LocalTime } from '@js-joda/core';
import { GymMembership } from '@/models/membership';

/** How far ahead notifications are scheduled. The app reschedules whenever it opens or a workout ends. */
const horizonDays = 14;
/** Past this many days overdue the nudges stop - someone who has fully stopped does not need daily guilt. */
const maxDaysOverdue = 7;
/** Days before a membership ends that the first heads-up is sent. A second goes out on the day itself. */
const membershipWarningDays = 3;

export const gymReminderIdPrefix = 'gym-reminder-';

/** Hours of the day the tracker reminders arrive. Fixed - the gym reminder time is the only one worth configuring. */
const waterReminderHour = 15;
const foodReminderHour = 20;
const milestoneHour = 9;
/** Smoke-free streak lengths worth a celebration. */
export const smokeFreeMilestones = [1, 3, 7, 14, 30, 60, 90, 180, 365];
/** Dinner is probably logged if this many things already are. */
const foodLoggedEnough = 2;
/** iOS keeps at most 64 pending local notifications and silently drops the rest, so the nearest ones win. */
const maxScheduled = 60;

export type PlannedGymReminder =
  | { id: string; at: LocalDateTime; kind: 'missed'; messageIndex: number; daysSince: number }
  | { id: string; at: LocalDateTime; kind: 'membershipEnding'; membershipName: string; daysLeft: number }
  | { id: string; at: LocalDateTime; kind: 'water' }
  | { id: string; at: LocalDateTime; kind: 'food' }
  | { id: string; at: LocalDateTime; kind: 'smokeFreeMilestone'; days: number };

/** What the daily trackers know about today. A tracker that is absent gets no reminders. */
export interface TrackerReminderInput {
  water?: { todayMet: boolean };
  food?: { todayEntries: number };
  /** The first day of the running smoke-free streak. Absent when there is no streak to celebrate. */
  smokeFree?: { streakStart: LocalDate };
}

export interface GymReminderPlanInput {
  now: LocalDateTime;
  /** The date of the most recent finished workout. Without one there is nothing to be late against. */
  lastWorkoutDate: LocalDate | undefined;
  /** Nudge once this many days have passed without a workout. */
  missedDays: number;
  /** Hour of the day (0-23) that reminders arrive. */
  hour: number;
  memberships: GymMembership[];
  /** How many witty messages exist, so the pick can rotate through them. */
  messageCount: number;
  trackers?: TrackerReminderInput | undefined;
}

/**
 * Works out which local notifications should exist, as a pure function of the clock and the history.
 * Scheduling replaces everything, so the plan never has to know what is already scheduled.
 */
export function planGymReminders(input: GymReminderPlanInput): PlannedGymReminder[] {
  return [...planMissedWorkoutNudges(input), ...planMembershipEndingReminders(input), ...planTrackerReminders(input)]
    .sort((a, b) => a.at.compareTo(b.at))
    .slice(0, maxScheduled);
}

function planMissedWorkoutNudges(input: GymReminderPlanInput): PlannedGymReminder[] {
  const { now, lastWorkoutDate, missedDays, hour, messageCount } = input;
  if (!lastWorkoutDate || messageCount <= 0) {
    return [];
  }
  const reminders: PlannedGymReminder[] = [];
  for (let offset = 0; offset < horizonDays; offset++) {
    const date = now.toLocalDate().plusDays(offset);
    const at = date.atTime(LocalTime.of(hour, 0));
    if (!at.isAfter(now)) {
      continue;
    }
    const daysSince = lastWorkoutDate.until(date, ChronoUnit.DAYS);
    if (daysSince >= missedDays && daysSince < missedDays + maxDaysOverdue) {
      reminders.push({
        id: `${gymReminderIdPrefix}missed-${date.toString()}`,
        at,
        kind: 'missed',
        // Keyed on the calendar date so the same day always gets the same joke, however often we replan.
        messageIndex: date.toEpochDay() % messageCount,
        daysSince,
      });
    }
  }
  return reminders;
}

function planMembershipEndingReminders(input: GymReminderPlanInput): PlannedGymReminder[] {
  const { now, hour, memberships } = input;
  const reminders: PlannedGymReminder[] = [];
  for (const membership of memberships) {
    if (!membership.endDate) {
      continue;
    }
    const endDate = LocalDate.parse(membership.endDate);
    for (const daysLeft of [membershipWarningDays, 0]) {
      const at = endDate.minusDays(daysLeft).atTime(LocalTime.of(hour, 0));
      if (at.isAfter(now)) {
        reminders.push({
          id: `${gymReminderIdPrefix}membership-${membership.id}-${daysLeft}`,
          at,
          kind: 'membershipEnding',
          membershipName: membership.name,
          daysLeft,
        });
      }
    }
  }
  return reminders;
}

function planTrackerReminders(input: GymReminderPlanInput): PlannedGymReminder[] {
  const { now, trackers } = input;
  if (!trackers) {
    return [];
  }
  const reminders: PlannedGymReminder[] = [];
  for (let offset = 0; offset < horizonDays; offset++) {
    const date = now.toLocalDate().plusDays(offset);
    const isToday = offset === 0;
    // Only today's state is known. Future days always get the reminder; replanning drops it if it turns out unneeded.
    if (trackers.water && !(isToday && trackers.water.todayMet)) {
      const at = date.atTime(LocalTime.of(waterReminderHour, 0));
      if (at.isAfter(now)) {
        reminders.push({ id: `${gymReminderIdPrefix}water-${date.toString()}`, at, kind: 'water' });
      }
    }
    if (trackers.food && !(isToday && trackers.food.todayEntries >= foodLoggedEnough)) {
      const at = date.atTime(LocalTime.of(foodReminderHour, 0));
      if (at.isAfter(now)) {
        reminders.push({ id: `${gymReminderIdPrefix}food-${date.toString()}`, at, kind: 'food' });
      }
    }
  }
  if (trackers.smokeFree) {
    // A streak of N days is complete at the end of its Nth day, so the celebration lands the morning after.
    for (const days of smokeFreeMilestones) {
      const at = trackers.smokeFree.streakStart.plusDays(days).atTime(LocalTime.of(milestoneHour, 0));
      if (at.isAfter(now)) {
        reminders.push({ id: `${gymReminderIdPrefix}smoke-free-${days}`, at, kind: 'smokeFreeMilestone', days });
      }
    }
  }
  return reminders;
}
