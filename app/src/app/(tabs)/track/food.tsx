import FullHeightScrollView from '@/components/layout/full-height-scroll-view';
import { SurfaceText } from '@/components/presentation/foundation/surface-text';
import { EntryRow } from '@/components/presentation/tracking/entry-row';
import { ProgressRing } from '@/components/presentation/tracking/progress-ring';
import { StreakChip } from '@/components/presentation/tracking/streak-chip';
import { TrackerCalendar } from '@/components/smart/tracker-calendar';
import { spacing, useAppTheme } from '@/hooks/useAppTheme';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useToday } from '@/hooks/useToday';
import { FoodEntry, mealTypes, sumMacros } from '@/models/tracking';
import { useAppSelector } from '@/store';
import { putFoodEntry, removeFoodEntry, selectFoodEntries } from '@/store/tracking';
import { selectStreak } from '@/store/tracking/derived';
import { uuid } from '@/utils/uuid';
import { Instant } from '@js-joda/core';
import { useTranslate } from '@tolgee/react';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Button from '@/components/presentation/foundation/button';
import { ProgressBar } from 'react-native-paper';
import { useDispatch } from 'react-redux';

export default function FoodPage() {
  const { t } = useTranslate();
  const { push } = useRouter();
  const dispatch = useDispatch();
  const { colors } = useAppTheme();
  const formatDate = useFormatDate();
  const today = useToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const settings = useAppSelector((s) => s.settings);
  const allEntries = useAppSelector(selectFoodEntries);
  const streak = useAppSelector((s) => selectStreak(s, 'food', today));

  const dateKey = selectedDate.toString();
  const entries = allEntries.filter((x) => x.date === dateKey);
  const yesterdayEntries = allEntries.filter((x) => x.date === selectedDate.minusDays(1).toString());
  const totals = sumMacros(entries);
  const isToday = selectedDate.isEqual(today);

  // Eating the same breakfast again is the most common thing there is, so one tap brings a whole day across.
  const copyPreviousDay = () => {
    for (const entry of yesterdayEntries) {
      dispatch(putFoodEntry({ ...entry, id: uuid(), date: dateKey, loggedAt: Instant.now().toString() }));
    }
  };

  const macroBars = [
    { key: 'protein', label: t('tracking.food.protein.label'), value: totals.protein, goal: settings.proteinGoalGrams },
    { key: 'carbs', label: t('tracking.food.carbs.label'), value: totals.carbs, goal: settings.carbsGoalGrams },
    { key: 'fat', label: t('tracking.food.fat.label'), value: totals.fat, goal: settings.fatGoalGrams },
  ] as const;

  return (
    <FullHeightScrollView contentContainerStyle={{ gap: spacing[4], padding: spacing.pageHorizontalMargin }}>
      <Stack.Screen options={{ title: t('tracking.food.title') }} />

      <View style={{ alignItems: 'center', gap: spacing[3] }}>
        <ProgressRing progress={totals.calories / Math.max(1, settings.calorieGoal)} size={180} strokeWidth={16}>
          <SurfaceText font="text-2xl" weight="bold">
            {Math.round(totals.calories)}
          </SurfaceText>
          <SurfaceText color="onSurfaceVariant" font="text-sm">
            {t('tracking.food.of_goal.message', { goal: settings.calorieGoal })}
          </SurfaceText>
        </ProgressRing>
        <SurfaceText color="onSurfaceVariant">
          {isToday
            ? t('tracking.today.label')
            : formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
        </SurfaceText>
        <StreakChip streak={streak} />
      </View>

      <View style={{ gap: spacing[3] }}>
        {macroBars.map((bar) => (
          <View key={bar.key} style={{ gap: spacing[1] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <SurfaceText font="text-sm">{bar.label}</SurfaceText>
              <SurfaceText font="text-sm" color="onSurfaceVariant">
                {`${Math.round(bar.value)} / ${bar.goal} g`}
              </SurfaceText>
            </View>
            <ProgressBar
              progress={Math.min(1, bar.value / Math.max(1, bar.goal))}
              color={colors.primary}
              style={{ height: 8, borderRadius: 4 }}
            />
          </View>
        ))}
      </View>

      {entries.length === 0 && yesterdayEntries.length > 0 && (
        <Button mode="outlined" onPress={copyPreviousDay}>
          {t('tracking.food.copy_previous.button')}
        </Button>
      )}

      {mealTypes.map((meal) => {
        const mealEntries = entries.filter((x) => x.meal === meal);
        return (
          <MealSection
            key={meal}
            title={t(`tracking.food.meal.${meal}.label`)}
            entries={mealEntries}
            onAdd={() => push({ pathname: '/track/food-add', params: { date: dateKey, meal } })}
            onDelete={(id) => dispatch(removeFoodEntry(id))}
          />
        );
      })}

      <TrackerCalendar kind="food" selectedDate={selectedDate} onDateSelect={setSelectedDate} />
    </FullHeightScrollView>
  );
}

function MealSection(props: {
  title: string;
  entries: FoodEntry[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslate();
  const calories = Math.round(sumMacros(props.entries).calories);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SurfaceText font="text-lg" weight="bold">
          {props.title}
        </SurfaceText>
        <SurfaceText color="onSurfaceVariant">{t('tracking.food.kcal.label', { count: calories })}</SurfaceText>
      </View>
      {props.entries.map((entry) => (
        <EntryRow
          key={entry.id}
          label={entry.name || t('tracking.food.quick_add.label')}
          detail={`P ${Math.round(entry.protein)} · C ${Math.round(entry.carbs)} · F ${Math.round(entry.fat)}`}
          trailing={t('tracking.food.kcal.label', { count: entry.calories })}
          onDelete={() => props.onDelete(entry.id)}
        />
      ))}
      <Button mode="text" onPress={props.onAdd} style={{ alignSelf: 'flex-start' }}>
        {t('tracking.food.add_to_meal.button')}
      </Button>
    </View>
  );
}
