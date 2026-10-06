import { gymReminderIdPrefix, PlannedGymReminder } from '@/models/gym-reminders';
import { nudgeMessages } from '@/models/gym-reminder-messages';
import { convert, ZoneId } from '@js-joda/core';
import { TolgeeInstance, TranslationKey } from '@tolgee/react';
import {
  AndroidImportance,
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
} from 'expo-notifications';
import { Platform } from 'react-native';

const channelId = 'gym_reminder_channel';

/**
 * Schedules the gym reminder notifications. The app cannot run in the background to decide whether to
 * nag, so it plans the next couple of weeks ahead of time and replaces the plan whenever it changes.
 */
export class GymReminderService {
  constructor(private tolgee: TolgeeInstance) {
    if (Platform.OS === 'android') {
      void setNotificationChannelAsync(channelId, {
        name: 'Gym reminders',
        description: 'Reminders to get to the gym and when a membership is about to end',
        importance: AndroidImportance.DEFAULT,
      });
    }
  }

  /** Asks the OS for permission. Call from a user action, not from a background sync. */
  async requestPermission(): Promise<boolean> {
    return (await requestPermissionsAsync()).granted;
  }

  /** Replaces every scheduled gym reminder with `reminders`. An empty list clears them. */
  async replaceAll(reminders: PlannedGymReminder[]) {
    if (Platform.OS === 'web') {
      return;
    }
    const scheduled = await getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((x) => x.identifier.startsWith(gymReminderIdPrefix))
        .map((x) => cancelScheduledNotificationAsync(x.identifier)),
    );
    if (!reminders.length || !(await getPermissionsAsync()).granted) {
      return;
    }
    for (const reminder of reminders) {
      const { title, body } = this.describe(reminder);
      await scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title, body, sound: true },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: convert(reminder.at.atZone(ZoneId.systemDefault())).toDate(),
          channelId,
        },
      });
    }
  }

  describe(reminder: PlannedGymReminder): { title: string; body: string } {
    if (reminder.kind === 'missed') {
      const [title, body] = nudgeMessages[reminder.messageIndex % nudgeMessages.length]!;
      const params = { days: reminder.daysSince };
      return { title: this.tolgee.t(title, params), body: this.tolgee.t(body, params) };
    }
    const params = { name: reminder.membershipName, days: reminder.daysLeft };
    return reminder.daysLeft === 0
      ? {
          title: this.tolgee.t('gym_reminders.membership_ending.today.title' satisfies TranslationKey),
          body: this.tolgee.t('gym_reminders.membership_ending.today.body' satisfies TranslationKey, params),
        }
      : {
          title: this.tolgee.t('gym_reminders.membership_ending.soon.title' satisfies TranslationKey),
          body: this.tolgee.t('gym_reminders.membership_ending.soon.body' satisfies TranslationKey, params),
        };
  }
}
