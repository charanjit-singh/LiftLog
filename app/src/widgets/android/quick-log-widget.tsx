import { barFraction, WidgetLabels, WidgetSnapshot } from '@/models/widget-data';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const palette = {
  light: { surface: '#fcfdf6', tile: '#eef2e6', text: '#1a1c18', muted: '#5f6358', track: '#d8dccf', primary: '#046f03', onPrimary: '#ffffff' },
  dark: { surface: '#1a1c18', tile: '#262922', text: '#e3e3dc', muted: '#a8aca0', track: '#3c4036', primary: '#8bd882', onPrimary: '#003a00' },
} as const;

type Colors = (typeof palette)[keyof typeof palette];

const formatWater = (ml: number, imperial: boolean) =>
  imperial ? `${Math.round(ml / 29.5735)} oz` : `${Math.round(ml)} ml`;

function Tile(props: {
  colors: Colors;
  title: string;
  value: string;
  goalText: string;
  fraction: number;
  barWidth: number;
  actionLabel: string;
  clickAction: string;
  clickActionData?: Record<string, unknown>;
  filled?: boolean;
}) {
  const { colors } = props;
  return (
    <FlexWidget style={{ flex: 1, flexDirection: 'column', padding: 10, margin: 4, backgroundColor: colors.tile, borderRadius: 16 }}>
      <TextWidget text={props.title} maxLines={1} truncate="END" style={{ fontSize: 12, color: colors.muted, fontWeight: 'bold' }} />
      <TextWidget text={props.value} maxLines={1} style={{ fontSize: 22, color: colors.text, fontWeight: 'bold' }} />
      <TextWidget text={props.goalText} maxLines={1} style={{ fontSize: 11, color: colors.muted }} />
      <FlexWidget style={{ height: 6, width: props.barWidth, marginVertical: 6, backgroundColor: colors.track, borderRadius: 3 }}>
        <FlexWidget
          style={{
            height: 6,
            width: Math.max(1, Math.round(props.barWidth * props.fraction)),
            backgroundColor: colors.primary,
            borderRadius: 3,
          }}
        />
      </FlexWidget>
      <FlexWidget
        clickAction={props.clickAction}
        clickActionData={props.clickActionData}
        style={{
          width: 'match_parent',
          paddingVertical: 7,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: props.filled ? colors.primary : colors.track,
          borderRadius: 12,
        }}
      >
        <TextWidget
          text={props.actionLabel}
          maxLines={1}
          style={{ fontSize: 13, fontWeight: 'bold', color: props.filled ? colors.onPrimary : colors.text }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function QuickLogAndroidWidget(props: {
  snapshot: WidgetSnapshot;
  labels: WidgetLabels;
  /** Widget width in dp, used to size the progress bars (the widget toolkit has no percentage widths). */
  width: number;
  theme: 'light' | 'dark';
}) {
  const { snapshot: s, labels } = props;
  const colors = palette[props.theme];
  const enabled = [s.water, s.food, s.smoking].filter(Boolean).length;
  // Outer padding (8) and each tile's margin (4 each side) come off before the tiles split what is left.
  const barWidth = Math.max(24, Math.floor((props.width - 16) / Math.max(1, enabled)) - 28);
  const streak = (days: number) => (days > 0 ? ` 🔥${days}` : '');

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'liftlog://track' }}
      style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'row', padding: 4, backgroundColor: colors.surface, borderRadius: 24 }}
    >
      {enabled === 0 && (
        <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget text={labels.empty} style={{ fontSize: 13, color: colors.text }} />
        </FlexWidget>
      )}
      {s.water && (
        <Tile
          colors={colors}
          title={`💧 ${labels.water}${streak(s.waterStreak)}`}
          value={formatWater(s.waterMl, s.imperial)}
          goalText={`/ ${formatWater(s.waterGoalMl, s.imperial)}`}
          fraction={barFraction(s.waterMl, s.waterGoalMl)}
          barWidth={barWidth}
          actionLabel={`+${formatWater(s.waterQuickMl, s.imperial)}`}
          clickAction="LOG_WATER"
          clickActionData={{ ml: s.waterQuickMl }}
          filled
        />
      )}
      {s.food && (
        <Tile
          colors={colors}
          title={`🍽️ ${labels.food}${streak(s.foodStreak)}`}
          value={`${Math.round(s.kcal)}`}
          goalText={`/ ${s.kcalGoal} kcal`}
          fraction={barFraction(s.kcal, s.kcalGoal)}
          barWidth={barWidth}
          actionLabel={labels.logFood}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'liftlog://track/food-add' }}
        />
      )}
      {s.smoking && (
        <Tile
          colors={colors}
          title={`🚭 ${labels.smoking}${streak(s.smokeFreeStreak)}`}
          value={`${s.cigarettes}`}
          goalText={s.cigaretteLimit > 0 ? `/ ${s.cigaretteLimit}` : ' '}
          // A quit attempt has no target to fill towards, so the bar shows how much of a limit is spent, if there is one.
          fraction={s.cigaretteLimit > 0 ? barFraction(s.cigarettes, s.cigaretteLimit) : 0}
          barWidth={barWidth}
          actionLabel={labels.smoked}
          clickAction="LOG_SMOKE"
        />
      )}
    </FlexWidget>
  );
}
