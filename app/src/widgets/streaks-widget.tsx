import type { WidgetLabels, WidgetSnapshot } from '@/models/widget-data';
import { Gauge, Text, VStack } from '@expo/ui/swift-ui';
import { font, gaugeStyle } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export interface StreaksWidgetProps extends WidgetSnapshot {
  labels: WidgetLabels;
}

/** Chosen when the widget is added to the Lock Screen (long-press, Edit Widget). */
export interface StreaksWidgetConfiguration {
  tracker: 'water' | 'food' | 'smoking';
}

/**
 * Lock Screen widgets: a ring and streak for one tracker (circular, inline) or all of them (rectangular).
 * There are no buttons - the Lock Screen is for glancing - so tapping one opens the Track tab.
 *
 * Like every widget layout this is stringified and run on its own, so it can reference nothing outside
 * itself: the tracker logic is repeated inline rather than imported.
 */
const streaksLayout = (props: StreaksWidgetProps, environment: WidgetEnvironment<StreaksWidgetConfiguration>) => {
  'widget';
  const fmtWater = (ml: number) => (props.imperial ? `${Math.round(ml / 29.5735)} oz` : `${Math.round(ml)} ml`);
  const clamp = (value: number) => Math.min(1, Math.max(0, value));

  const trackers = [];
  if (props.water) {
    trackers.push({
      key: 'water',
      emoji: '💧',
      value: fmtWater(props.waterMl),
      fraction: clamp(props.waterMl / Math.max(1, props.waterGoalMl)),
      streak: props.waterStreak,
    });
  }
  if (props.food) {
    trackers.push({
      key: 'food',
      emoji: '🍽️',
      value: `${Math.round(props.kcal)} kcal`,
      fraction: clamp(props.kcal / Math.max(1, props.kcalGoal)),
      streak: props.foodStreak,
    });
  }
  if (props.smoking) {
    trackers.push({
      key: 'smoking',
      emoji: '🚭',
      value: `${props.cigarettes}`,
      // No fill for a quit attempt: the ring is full while the day is clean and drains as the limit is used.
      fraction:
        props.cigaretteLimit > 0 ? clamp(1 - props.cigarettes / props.cigaretteLimit) : props.cigarettes === 0 ? 1 : 0,
      streak: props.smokeFreeStreak,
    });
  }

  const wanted = environment.configuration?.tracker;
  const chosen = trackers.find((tracker) => tracker.key === wanted) ?? trackers[0];

  if (!chosen) {
    return <Text>{props.labels.empty}</Text>;
  }

  if (environment.widgetFamily === 'accessoryCircular') {
    return (
      <Gauge
        value={chosen.fraction}
        modifiers={[gaugeStyle('circularCapacity')]}
        currentValueLabel={
          <Text modifiers={[font({ size: 16, weight: 'bold', design: 'rounded' })]}>{`${chosen.streak}`}</Text>
        }
      >
        <Text>{chosen.emoji}</Text>
      </Gauge>
    );
  }

  if (environment.widgetFamily === 'accessoryInline') {
    return <Text>{`${chosen.emoji} ${chosen.value}${chosen.streak > 0 ? ` · 🔥${chosen.streak}` : ''}`}</Text>;
  }

  // accessoryRectangular: one line per tracker, so a glance shows everything.
  return (
    <VStack alignment="leading" spacing={2}>
      {trackers.map((tracker) => (
        <Text key={tracker.key} modifiers={[font({ size: 13, weight: 'semibold' })]}>
          {`${tracker.emoji} ${tracker.value}${tracker.streak > 0 ? `  🔥${tracker.streak}` : ''}`}
        </Text>
      ))}
    </VStack>
  );
};

export const streaksWidget = createWidget<StreaksWidgetProps, StreaksWidgetConfiguration>('Streaks', streaksLayout);
