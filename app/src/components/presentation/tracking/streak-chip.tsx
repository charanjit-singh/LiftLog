import { SurfaceText } from '@/components/presentation/foundation/surface-text';
import { rounding, spacing, useAppTheme } from '@/hooks/useAppTheme';
import { StreakResult } from '@/models/tracking';
import { useTranslate } from '@tolgee/react';
import { View } from 'react-native';

/** The current streak and personal best. A zero streak says so kindly instead of showing a sad number. */
export function StreakChip({ streak }: { streak: StreakResult }) {
  const { t } = useTranslate();
  const { colors } = useAppTheme();
  const active = streak.current > 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[2],
        alignSelf: 'flex-start',
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1],
        borderRadius: rounding.roundedRectangleRadius,
        backgroundColor: active ? colors.tertiaryContainer : colors.surfaceContainerHighest,
      }}
    >
      <SurfaceText>{active ? '🔥' : '🌱'}</SurfaceText>
      <SurfaceText font="text-sm" weight="bold" color={active ? 'onTertiaryContainer' : 'onSurfaceVariant'}>
        {active
          ? t('tracking.streak.days', { count: streak.current })
          : t(streak.best > 0 ? 'tracking.streak.restart' : 'tracking.streak.start')}
      </SurfaceText>
      {streak.best > streak.current && (
        <SurfaceText font="text-xs" color="onSurfaceVariant">
          {t('tracking.streak.best', { count: streak.best })}
        </SurfaceText>
      )}
    </View>
  );
}
