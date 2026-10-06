import FullHeightScrollView from '@/components/layout/full-height-scroll-view';
import { SurfaceText } from '@/components/presentation/foundation/surface-text';
import { EntryRow, formatLoggedTime } from '@/components/presentation/tracking/entry-row';
import { ProgressRing } from '@/components/presentation/tracking/progress-ring';
import { StreakChip } from '@/components/presentation/tracking/streak-chip';
import { TrackerCalendar } from '@/components/smart/tracker-calendar';
import { spacing } from '@/hooks/useAppTheme';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useToday } from '@/hooks/useToday';
import { smokingSpend } from '@/models/tracking';
import { useAppSelector } from '@/store';
import { removeSmokeEntry, selectSmokeEntries } from '@/store/tracking';
import { selectSmokeTotals, selectStreak } from '@/store/tracking/derived';
import { logCigarette } from '@/store/tracking/log';
import { useTranslate } from '@tolgee/react';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Button from '@/components/presentation/foundation/button';
import { useDispatch } from 'react-redux';

export default function SmokingPage() {
  const { t } = useTranslate();
  const dispatch = useDispatch();
  const formatDate = useFormatDate();
  const today = useToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const limit = useAppSelector((s) => s.settings.smokingDailyLimit);
  const priceCents = useAppSelector((s) => s.settings.smokingCigarettePriceCents);
  const totals = useAppSelector(selectSmokeTotals);
  const entries = useAppSelector(selectSmokeEntries)
    .filter((x) => x.date === selectedDate.toString())
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  const streak = useAppSelector((s) => selectStreak(s, 'smoking', today));
  const count = totals.get(selectedDate.toString()) ?? 0;
  const isToday = selectedDate.isEqual(today);

  const lastWeek = Array.from({ length: 7 }, (_, i) => totals.get(today.minusDays(i).toString()) ?? 0);
  const lastWeekTotal = lastWeek.reduce((a, b) => a + b, 0);

  return (
    <FullHeightScrollView contentContainerStyle={{ gap: spacing[4], padding: spacing.pageHorizontalMargin }}>
      <Stack.Screen options={{ title: t('tracking.smoking.title') }} />

      <View style={{ alignItems: 'center', gap: spacing[3] }}>
        <ProgressRing progress={limit > 0 ? 1 - count / limit : count === 0 ? 1 : 0} size={180} strokeWidth={16}>
          <SurfaceText font="text-2xl" weight="bold">
            {count}
          </SurfaceText>
          <SurfaceText color="onSurfaceVariant" font="text-sm">
            {limit > 0 ? t('tracking.smoking.of_limit.message', { limit }) : t('tracking.smoking.cigarettes.label')}
          </SurfaceText>
        </ProgressRing>
        <SurfaceText color="onSurfaceVariant">
          {isToday
            ? t('tracking.today.label')
            : formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
        </SurfaceText>
        <StreakChip streak={streak} />
      </View>

      <Button mode="contained-tonal" onPress={() => dispatch(logCigarette(selectedDate))}>
        {t('tracking.smoking.add.button')}
      </Button>

      <View style={{ gap: spacing[1] }}>
        <SurfaceText color="onSurfaceVariant">
          {t('tracking.smoking.week.message', { count: lastWeekTotal })}
        </SurfaceText>
        {priceCents > 0 && (
          <SurfaceText color="onSurfaceVariant">
            {t('tracking.smoking.week_cost.message', {
              amount: smokingSpend(lastWeekTotal, priceCents).toFixed(2),
            })}
          </SurfaceText>
        )}
      </View>

      <TrackerCalendar kind="smoking" selectedDate={selectedDate} onDateSelect={setSelectedDate} />

      <View>
        {entries.length === 0 ? (
          <SurfaceText color="onSurfaceVariant">{t('tracking.smoking.empty.message')}</SurfaceText>
        ) : (
          entries.map((entry) => (
            <EntryRow
              key={entry.id}
              label={formatLoggedTime(entry.loggedAt)}
              onDelete={() => dispatch(removeSmokeEntry(entry.id))}
            />
          ))
        )}
      </View>
    </FullHeightScrollView>
  );
}
