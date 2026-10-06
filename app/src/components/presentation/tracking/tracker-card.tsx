import TouchableRipple from '@/components/presentation/foundation/touchable-ripple';
import { SurfaceText } from '@/components/presentation/foundation/surface-text';
import { ProgressRing } from '@/components/presentation/tracking/progress-ring';
import { StreakChip } from '@/components/presentation/tracking/streak-chip';
import { spacing } from '@/hooks/useAppTheme';
import { StreakResult } from '@/models/tracking';
import { ReactNode } from 'react';
import { View } from 'react-native';
import Button from '@/components/presentation/foundation/button';
import { Card } from 'react-native-paper';

/** One tracker on the Today page: a ring, the headline number, the streak, and the one tap that matters. */
export function TrackerCard(props: {
  title: string;
  emoji: string;
  progress: number;
  headline: string;
  caption: string;
  streak: StreakResult;
  ringColor?: string;
  actionLabel: string;
  onAction: () => void;
  onPress: () => void;
  testID?: string;
  children?: ReactNode;
}) {
  return (
    <Card mode="contained" style={{ overflow: 'hidden' }} testID={props.testID}>
      <TouchableRipple onPress={props.onPress}>
        <View style={{ padding: spacing[4], gap: spacing[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <SurfaceText font="text-lg">{props.emoji}</SurfaceText>
            <SurfaceText font="text-lg" weight="bold">
              {props.title}
            </SurfaceText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
            <ProgressRing progress={props.progress} size={96} strokeWidth={10} color={props.ringColor}>
              <SurfaceText font="text-lg" weight="bold">
                {props.headline}
              </SurfaceText>
            </ProgressRing>
            <View style={{ flex: 1, gap: spacing[2] }}>
              <SurfaceText color="onSurfaceVariant">{props.caption}</SurfaceText>
              <StreakChip streak={props.streak} />
            </View>
          </View>
          {props.children}
          <Button mode="contained-tonal" onPress={props.onAction}>
            {props.actionLabel}
          </Button>
        </View>
      </TouchableRipple>
    </Card>
  );
}
