import type { PendingWidgetLog, WidgetLabels, WidgetSnapshot } from '@/models/widget-data';
import { Button, HStack, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export interface QuickLogWidgetProps extends WidgetSnapshot {
  labels: WidgetLabels;
  /** Taps the app has not yet turned into entries. See `PendingWidgetLog`. */
  pendingLog: PendingWidgetLog[];
}

/**
 * The widget is stringified and evaluated in the widget extension's own JavaScript runtime, so this function
 * can reach nothing outside itself: no imports, no helpers, no app state. The UI components above are
 * injected as globals there. Anything it needs arrives in `props`, and a button's onPress returns the props it changes.
 */
const quickLogLayout = (props: QuickLogWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const small = environment.widgetFamily === 'systemSmall';
  const fmtWater = (ml: number) => (props.imperial ? `${Math.round(ml / 29.5735)} oz` : `${Math.round(ml)} ml`);
  const streak = (days: number) => (days > 0 ? ` 🔥${days}` : '');

  const tiles = [];

  if (props.water) {
    tiles.push(
      <VStack key="water" alignment="leading" spacing={4}>
        <Text
          modifiers={[
            font({ size: 12, weight: 'semibold' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          {`💧 ${props.labels.water}${streak(props.waterStreak)}`}
        </Text>
        <Text modifiers={[font({ size: small ? 20 : 22, weight: 'bold', design: 'rounded' })]}>
          {fmtWater(props.waterMl)}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
          {`/ ${fmtWater(props.waterGoalMl)}`}
        </Text>
        <Button
          label={`+${fmtWater(props.waterQuickMl)}`}
          modifiers={[buttonStyle('borderedProminent')]}
          onPress={() => ({
            waterMl: props.waterMl + props.waterQuickMl,
            pendingLog: [...props.pendingLog, { kind: 'water', amount: props.waterQuickMl, at: Date.now() }],
          })}
        />
      </VStack>,
    );
  }

  if (props.food) {
    tiles.push(
      <VStack key="food" alignment="leading" spacing={4}>
        <Text
          modifiers={[
            font({ size: 12, weight: 'semibold' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          {`🍽️ ${props.labels.food}${streak(props.foodStreak)}`}
        </Text>
        <Text
          modifiers={[font({ size: small ? 20 : 22, weight: 'bold', design: 'rounded' })]}
        >{`${Math.round(props.kcal)}`}</Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
          {`/ ${props.kcalGoal} kcal`}
        </Text>
        {/* Food needs a name and a number, so it opens the add screen rather than logging blind. */}
        <Link label={props.labels.logFood} destination="liftlog://track/food-add" />
      </VStack>,
    );
  }

  if (props.smoking) {
    tiles.push(
      <VStack key="smoking" alignment="leading" spacing={4}>
        <Text
          modifiers={[
            font({ size: 12, weight: 'semibold' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          {`🚭 ${props.labels.smoking}${streak(props.smokeFreeStreak)}`}
        </Text>
        <Text
          modifiers={[font({ size: small ? 20 : 22, weight: 'bold', design: 'rounded' })]}
        >{`${props.cigarettes}`}</Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
          {props.cigaretteLimit > 0 ? `/ ${props.cigaretteLimit}` : ' '}
        </Text>
        <Button
          label={props.labels.smoked}
          modifiers={[buttonStyle('bordered')]}
          onPress={() => ({
            cigarettes: props.cigarettes + 1,
            pendingLog: [...props.pendingLog, { kind: 'smoking', amount: 0, at: Date.now() }],
          })}
        />
      </VStack>,
    );
  }

  // A small widget has room for one tracker; a medium one fits all three side by side.
  const shown = small ? tiles.slice(0, 1) : tiles;

  return (
    <HStack
      alignment="top"
      spacing={12}
      modifiers={[
        padding({ all: 4 }),
        frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
        containerBackground('#00000000', 'widget'),
        widgetURL('liftlog://track'),
      ]}
    >
      {shown.length === 0 ? <Text>{props.labels.empty}</Text> : shown}
      <Spacer />
    </HStack>
  );
};

export const quickLogWidget = createWidget<QuickLogWidgetProps>('QuickLog', quickLogLayout);
