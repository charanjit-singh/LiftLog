import FullHeightScrollView from '@/components/layout/full-height-scroll-view';
import { SurfaceText } from '@/components/presentation/foundation/surface-text';
import { EntryRow, formatLoggedTime } from '@/components/presentation/tracking/entry-row';
import { ProgressRing } from '@/components/presentation/tracking/progress-ring';
import { StreakChip } from '@/components/presentation/tracking/streak-chip';
import { TrackerCalendar } from '@/components/smart/tracker-calendar';
import { spacing } from '@/hooks/useAppTheme';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useToday } from '@/hooks/useToday';
import { formatWater, waterQuickAmounts } from '@/models/tracking';
import { useAppSelector } from '@/store';
import { removeWaterEntry, selectWaterEntries } from '@/store/tracking';
import { selectStreak, selectWaterTotals } from '@/store/tracking/derived';
import { logWater } from '@/store/tracking/log';
import { useTranslate } from '@tolgee/react';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Button from '@/components/presentation/foundation/button';
import { TextInput } from 'react-native-paper';
import { useDispatch } from 'react-redux';

const mlPerOunce = 29.5735;

export default function WaterPage() {
  const { t } = useTranslate();
  const dispatch = useDispatch();
  const formatDate = useFormatDate();
  const today = useToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [custom, setCustom] = useState('');
  const imperial = useAppSelector((s) => s.settings.useImperialUnits);
  const goal = useAppSelector((s) => s.settings.waterGoalMl);
  const totals = useAppSelector(selectWaterTotals);
  const entries = useAppSelector(selectWaterEntries)
    .filter((x) => x.date === selectedDate.toString())
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  const streak = useAppSelector((s) => selectStreak(s, 'water', today));
  const ml = totals.get(selectedDate.toString()) ?? 0;
  const isToday = selectedDate.isEqual(today);

  const weekAverage =
    Array.from({ length: 7 }, (_, i) => totals.get(today.minusDays(i).toString()) ?? 0).reduce((a, b) => a + b, 0) / 7;

  const addCustom = () => {
    const amount = Number.parseFloat(custom);
    if (Number.isFinite(amount) && amount > 0) {
      dispatch(logWater(Math.round(imperial ? amount * mlPerOunce : amount), selectedDate));
      setCustom('');
    }
  };

  return (
    <FullHeightScrollView contentContainerStyle={{ gap: spacing[4], padding: spacing.pageHorizontalMargin }}>
      <Stack.Screen options={{ title: t('tracking.water.title') }} />

      <View style={{ alignItems: 'center', gap: spacing[3] }}>
        <ProgressRing progress={ml / Math.max(1, goal)} size={180} strokeWidth={16}>
          <SurfaceText font="text-2xl" weight="bold">
            {formatWater(ml, imperial)}
          </SurfaceText>
          <SurfaceText color="onSurfaceVariant" font="text-sm">
            {t('tracking.water.of_goal.message', { goal: formatWater(goal, imperial) })}
          </SurfaceText>
        </ProgressRing>
        <SurfaceText color="onSurfaceVariant">
          {isToday
            ? t('tracking.today.label')
            : formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
        </SurfaceText>
        <StreakChip streak={streak} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {waterQuickAmounts(imperial).map((amount) => (
          <Button
            key={amount}
            mode="contained-tonal"
            style={{ flexGrow: 1 }}
            onPress={() => dispatch(logWater(amount, selectedDate))}
          >
            {`+${formatWater(amount, imperial)}`}
          </Button>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'center' }}>
        <TextInput
          mode="outlined"
          style={{ flex: 1 }}
          label={t('tracking.water.custom.label', { unit: imperial ? 'oz' : 'ml' })}
          keyboardType="numeric"
          value={custom}
          onChangeText={setCustom}
          onSubmitEditing={addCustom}
        />
        <Button mode="contained" onPress={addCustom} disabled={!custom}>
          {t('tracking.add.button')}
        </Button>
      </View>

      <SurfaceText color="onSurfaceVariant">
        {t('tracking.water.average.message', { amount: formatWater(weekAverage, imperial) })}
      </SurfaceText>

      <TrackerCalendar kind="water" selectedDate={selectedDate} onDateSelect={setSelectedDate} />

      <View>
        {entries.length === 0 ? (
          <SurfaceText color="onSurfaceVariant">{t('tracking.water.empty.message')}</SurfaceText>
        ) : (
          entries.map((entry) => (
            <EntryRow
              key={entry.id}
              label={formatLoggedTime(entry.loggedAt)}
              trailing={formatWater(entry.ml, imperial)}
              onDelete={() => dispatch(removeWaterEntry(entry.id))}
            />
          ))
        )}
      </View>
    </FullHeightScrollView>
  );
}
