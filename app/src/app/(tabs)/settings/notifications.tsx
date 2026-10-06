import { RootState, useAppSelector } from '@/store';
import { broadcastWorkoutEvent } from '@/store/workout-worker';
import { workoutUpdatedEvent } from '@/store/workout-worker/helpers';
import { selectActiveSession } from '@/store/stored-sessions';
import {
  setGymReminderHour,
  setGymReminderMissedDays,
  setGymReminders,
  setRestNotifications,
  setRestTimersEnabled,
} from '@/store/settings';
import { showSnackbar } from '@/store/app';
import { useServices } from '@/components/smart/services-provider';
import { SegmentedListSelect } from '@/components/presentation/foundation/segmented-list-select';
import { useTranslate } from '@tolgee/react';
import { useDispatch } from 'react-redux';
import { SettingsPage } from '@/components/layout/settings-page';
import { SegmentedListSwitch } from '@/components/presentation/foundation/segmented-list-switch';
import { SegmentedGroup } from '@/components/presentation/foundation/segmented-list';

export default function NotificationsPage() {
  const { t } = useTranslate();
  const settings = useAppSelector((state: RootState) => state.settings);
  const currentWorkout = useAppSelector(selectActiveSession);
  const dispatch = useDispatch();
  const { gymReminderService } = useServices();
  // Turning it on is the moment to ask, so the system prompt has context. A refusal leaves it off.
  const toggleGymReminders = async (enabled: boolean) => {
    if (enabled && !(await gymReminderService.requestPermission())) {
      dispatch(showSnackbar({ text: t('gym_reminders.permission_denied.message') }));
      return;
    }
    dispatch(setGymReminders(enabled));
  };
  return (
    <SettingsPage title={t('settings.notifications.title')} caption={t('settings.notifications.subtitle')}>
      <SegmentedGroup>
        <SegmentedListSwitch
          label={t('rest.notifications.title')}
          icon={'notifications'}
          supportingText={t('rest.notifications.subtitle')}
          value={settings.restNotifications}
          onValueChange={(value) => {
            dispatch(setRestNotifications(value));
            if (currentWorkout) {
              dispatch(
                broadcastWorkoutEvent({
                  type: value ? 'WorkoutStartedEvent' : 'WorkoutEndedEvent',
                }),
              );
              dispatch(broadcastWorkoutEvent(workoutUpdatedEvent(currentWorkout, settings.restTimersEnabled)));
            }
          }}
        />
        <SegmentedListSwitch
          testID="setRestTimersEnabled"
          label={t('workout.rest_timers.label')}
          icon={'timer'}
          supportingText={t('workout.rest_timers.subtitle')}
          value={settings.restTimersEnabled}
          onValueChange={(value) => dispatch(setRestTimersEnabled(value))}
        />
      </SegmentedGroup>
      <SegmentedGroup>
        <SegmentedListSwitch
          label={t('gym_reminders.title')}
          icon={'fitnessCenter'}
          supportingText={t('gym_reminders.subtitle')}
          value={settings.gymReminders}
          onValueChange={(value) => void toggleGymReminders(value)}
        />
        <SegmentedListSelect
          label={t('gym_reminders.missed_days.label')}
          icon={'calendar'}
          enabled={settings.gymReminders}
          value={settings.gymReminderMissedDays}
          options={[1, 2, 3, 4, 5].map((count) => ({
            value: count,
            label: t('gym_reminders.missed_days.option', { count }),
          }))}
          onChange={(value) => dispatch(setGymReminderMissedDays(value))}
        />
        <SegmentedListSelect
          label={t('gym_reminders.hour.label')}
          icon={'timer'}
          enabled={settings.gymReminders}
          value={settings.gymReminderHour}
          options={Array.from({ length: 17 }, (_, i) => i + 6).map((hour) => ({
            value: hour,
            label: `${hour.toString().padStart(2, '0')}:00`,
          }))}
          onChange={(value) => dispatch(setGymReminderHour(value))}
        />
      </SegmentedGroup>
    </SettingsPage>
  );
}
