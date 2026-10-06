import { TranslationKey } from '@tolgee/react';

/** Title and body per witty nudge. The planner rotates through these by index. */
export const nudgeMessages = [
  ['gym_reminders.nudge.1.title', 'gym_reminders.nudge.1.body'],
  ['gym_reminders.nudge.2.title', 'gym_reminders.nudge.2.body'],
  ['gym_reminders.nudge.3.title', 'gym_reminders.nudge.3.body'],
  ['gym_reminders.nudge.4.title', 'gym_reminders.nudge.4.body'],
  ['gym_reminders.nudge.5.title', 'gym_reminders.nudge.5.body'],
  ['gym_reminders.nudge.6.title', 'gym_reminders.nudge.6.body'],
  ['gym_reminders.nudge.7.title', 'gym_reminders.nudge.7.body'],
  ['gym_reminders.nudge.8.title', 'gym_reminders.nudge.8.body'],
  ['gym_reminders.nudge.9.title', 'gym_reminders.nudge.9.body'],
  ['gym_reminders.nudge.10.title', 'gym_reminders.nudge.10.body'],
] as const satisfies readonly (readonly [TranslationKey, TranslationKey])[];
