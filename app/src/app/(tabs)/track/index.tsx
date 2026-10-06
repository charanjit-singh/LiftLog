import FullHeightScrollView from '@/components/layout/full-height-scroll-view';
import { SurfaceText } from '@/components/presentation/foundation/surface-text';
import { TrackerCard } from '@/components/presentation/tracking/tracker-card';
import { spacing } from '@/hooks/useAppTheme';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useToday } from '@/hooks/useToday';
import { formatWater, waterQuickAmounts } from '@/models/tracking';
import { useAppSelector } from '@/store';
import { logCigarette, logWater } from '@/store/tracking/log';
import { selectCalorieTotals, selectSmokeTotals, selectStreak, selectWaterTotals } from '@/store/tracking/derived';
import { useTranslate } from '@tolgee/react';
import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';
import Button from '@/components/presentation/foundation/button';
import { useDispatch } from 'react-redux';

export default function TrackPage() {
  const { t } = useTranslate();
  const { push } = useRouter();
  const formatDate = useFormatDate();
  const today = useToday();
  const settings = useAppSelector((s) => s.settings);
  const anyEnabled = settings.trackWater || settings.trackFood || settings.trackSmoking;

  return (
    <FullHeightScrollView contentContainerStyle={{ gap: spacing[3], padding: spacing.pageHorizontalMargin }}>
      <Stack.Screen options={{ title: t('tracking.title') }} />
      <SurfaceText font="text-xl" weight="bold">
        {formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}
      </SurfaceText>
      {settings.trackWater && <WaterCard />}
      {settings.trackFood && <FoodCard />}
      {settings.trackSmoking && <SmokingCard />}
      {!anyEnabled && (
        <View style={{ gap: spacing[3] }}>
          <SurfaceText color="onSurfaceVariant">{t('tracking.none_enabled.message')}</SurfaceText>
          <Button mode="contained" onPress={() => push('/settings/tracking')}>
            {t('tracking.settings.button')}
          </Button>
        </View>
      )}
    </FullHeightScrollView>
  );
}

function WaterCard() {
  const { t } = useTranslate();
  const { push } = useRouter();
  const dispatch = useDispatch();
  const today = useToday();
  const imperial = useAppSelector((s) => s.settings.useImperialUnits);
  const goal = useAppSelector((s) => s.settings.waterGoalMl);
  const ml = useAppSelector(selectWaterTotals).get(today.toString()) ?? 0;
  const streak = useAppSelector((s) => selectStreak(s, 'water', today));
  const quickAmount = waterQuickAmounts(imperial)[1]!;
  return (
    <TrackerCard
      testID="track-water-card"
      title={t('tracking.water.title')}
      emoji="💧"
      progress={ml / Math.max(1, goal)}
      headline={formatWater(ml, imperial)}
      caption={
        ml >= goal
          ? t('tracking.water.goal_reached.message')
          : t('tracking.water.remaining.message', { amount: formatWater(goal - ml, imperial) })
      }
      streak={streak}
      actionLabel={t('tracking.water.add.button', { amount: formatWater(quickAmount, imperial) })}
      onAction={() => dispatch(logWater(quickAmount, today))}
      onPress={() => push('/track/water')}
    />
  );
}

function FoodCard() {
  const { t } = useTranslate();
  const { push } = useRouter();
  const today = useToday();
  const goal = useAppSelector((s) => s.settings.calorieGoal);
  const kcal = useAppSelector(selectCalorieTotals).get(today.toString()) ?? 0;
  const streak = useAppSelector((s) => selectStreak(s, 'food', today));
  const remaining = goal - kcal;
  return (
    <TrackerCard
      testID="track-food-card"
      title={t('tracking.food.title')}
      emoji="🍽️"
      progress={kcal / Math.max(1, goal)}
      headline={Math.abs(remaining).toString()}
      caption={
        remaining >= 0
          ? t('tracking.food.remaining.message', { count: remaining })
          : t('tracking.food.over.message', { count: -remaining })
      }
      streak={streak}
      actionLabel={t('tracking.food.add.button')}
      onAction={() => push({ pathname: '/track/food-add', params: { date: today.toString() } })}
      onPress={() => push('/track/food')}
    />
  );
}

function SmokingCard() {
  const { t } = useTranslate();
  const { push } = useRouter();
  const dispatch = useDispatch();
  const today = useToday();
  const limit = useAppSelector((s) => s.settings.smokingDailyLimit);
  const count = useAppSelector(selectSmokeTotals).get(today.toString()) ?? 0;
  const streak = useAppSelector((s) => selectStreak(s, 'smoking', today));
  return (
    <TrackerCard
      testID="track-smoking-card"
      title={t('tracking.smoking.title')}
      emoji="🚭"
      // A quit attempt has no "fill": the ring is full while the day is clean and drains as limit is used up.
      progress={limit > 0 ? 1 - count / limit : count === 0 ? 1 : 0}
      headline={count.toString()}
      caption={
        limit > 0
          ? t('tracking.smoking.limit.message', { count, limit })
          : count === 0
            ? t('tracking.smoking.clean_today.message')
            : t('tracking.smoking.today.message', { count })
      }
      streak={streak}
      actionLabel={t('tracking.smoking.add.button')}
      onAction={() => dispatch(logCigarette(today))}
      onPress={() => push('/track/smoking')}
    />
  );
}
