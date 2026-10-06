import { WidgetInfo, WidgetTaskHandlerProps } from 'react-native-android-widget';
import { defaultWidgetLabels, WidgetLabels, WidgetSnapshot } from '@/models/widget-data';
import { buildWidgetSnapshot } from '@/store/tracking/widget-snapshot';
import { QuickLogAndroidWidget } from '@/widgets/android/quick-log-widget';
import { loadLabels, loadWidgetState, recordCigarette, recordWater } from '@/widgets/android/widget-storage';
import { LocalDate } from '@js-joda/core';

export const quickLogWidgetName = 'QuickLog';

/** The light and dark renderings of the widget for a given snapshot. */
export function renderSnapshot(snapshot: WidgetSnapshot, labels: WidgetLabels, width: number) {
  return {
    light: <QuickLogAndroidWidget snapshot={snapshot} labels={labels} width={width} theme="light" />,
    dark: <QuickLogAndroidWidget snapshot={snapshot} labels={labels} width={width} theme="dark" />,
  };
}

/** Draws the widget from what is on disk. If the database is not ready (a fresh install) it says so. */
export async function renderQuickLog(info: Pick<WidgetInfo, 'width'>) {
  const labels = await loadLabels();
  try {
    return renderSnapshot(buildWidgetSnapshot(await loadWidgetState(), LocalDate.now()), labels, info.width);
  } catch {
    const empty = { ...labels, empty: labels.empty || defaultWidgetLabels.empty };
    const blank = buildBlank();
    return {
      light: <QuickLogAndroidWidget snapshot={blank} labels={empty} width={info.width} theme="light" />,
      dark: <QuickLogAndroidWidget snapshot={blank} labels={empty} width={info.width} theme="dark" />,
    };
  }
}

function buildBlank() {
  return {
    day: LocalDate.now().toString(),
    imperial: false,
    water: false,
    waterMl: 0,
    waterGoalMl: 0,
    waterQuickMl: 0,
    waterStreak: 0,
    food: false,
    kcal: 0,
    kcalGoal: 0,
    foodStreak: 0,
    smoking: false,
    cigarettes: 0,
    cigaretteLimit: 0,
    smokeFreeStreak: 0,
  };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== quickLogWidgetName) {
    return;
  }
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(await renderQuickLog(props.widgetInfo));
      break;
    case 'WIDGET_CLICK':
      // The tap is written straight to the app's database, so it is logged even if the app was not running.
      // The app reloads from the database next time it comes to the foreground.
      try {
        if (props.clickAction === 'LOG_WATER') {
          const ml = Number(props.clickActionData?.ml);
          if (Number.isFinite(ml) && ml > 0) {
            await recordWater(Math.round(ml));
          }
        } else if (props.clickAction === 'LOG_SMOKE') {
          await recordCigarette();
        }
      } finally {
        props.renderWidget(await renderQuickLog(props.widgetInfo));
      }
      break;
    default:
      break;
  }
}
