import { describe, it, expect, vi } from 'vitest';
import type { ReactElement } from 'react';
import type { QuickLogWidgetProps } from '@/widgets/quick-log-widget';
import type { StreaksWidgetProps } from '@/widgets/streaks-widget';

// The widget layouts are plain functions in tests (the 'widget' directive is only meaningful to the Expo
// babel preset). The native UI components they draw with are replaced by named stand-ins we can inspect.
const { stub } = vi.hoisted(() => ({
  stub: (name: string) => {
    const component = () => null;
    Object.defineProperty(component, 'name', { value: name });
    return component;
  },
}));

vi.mock('@expo/ui/swift-ui', () => ({
  Button: stub('Button'),
  Gauge: stub('Gauge'),
  HStack: stub('HStack'),
  Link: stub('Link'),
  Spacer: stub('Spacer'),
  Text: stub('Text'),
  VStack: stub('VStack'),
}));
vi.mock('@expo/ui/swift-ui/modifiers', () => {
  const modifier =
    (name: string) =>
    (...args: unknown[]) => ({ name, args });
  return {
    buttonStyle: modifier('buttonStyle'),
    containerBackground: modifier('containerBackground'),
    font: modifier('font'),
    foregroundStyle: modifier('foregroundStyle'),
    frame: modifier('frame'),
    gaugeStyle: modifier('gaugeStyle'),
    padding: modifier('padding'),
    widgetURL: modifier('widgetURL'),
  };
});
vi.mock('expo-widgets', () => ({
  createWidget: (name: string, layout: unknown) => ({ name, layout }),
}));

type Layout<P> = (props: P, environment: Record<string, unknown>) => ReactElement;

const { quickLogWidget } = (await import('@/widgets/quick-log-widget')) as unknown as {
  quickLogWidget: { layout: Layout<QuickLogWidgetProps> };
};
const { streaksWidget } = (await import('@/widgets/streaks-widget')) as unknown as {
  streaksWidget: { layout: Layout<StreaksWidgetProps> };
};

interface Found {
  type: string;
  props: Record<string, unknown>;
}

/** Every element in the tree, including ones passed as props (such as a gauge's value label). */
function walk(node: unknown, found: Found[] = []): Found[] {
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, found));
  } else if (node && typeof node === 'object' && 'type' in node && 'props' in node) {
    const element = node as { type: { name?: string } | string; props: Record<string, unknown> };
    found.push({
      type: typeof element.type === 'string' ? element.type : (element.type.name ?? '?'),
      props: element.props,
    });
    Object.values(element.props).forEach((value) => walk(value, found));
  }
  return found;
}

const textOf = (tree: unknown) =>
  walk(tree)
    .filter((x) => x.type === 'Text')
    .map((x) => x.props.children)
    .flat(Infinity)
    .filter((x): x is string => typeof x === 'string');

const snapshot = {
  day: '2026-10-10',
  imperial: false,
  water: true,
  waterMl: 750,
  waterGoalMl: 2000,
  waterQuickMl: 250,
  waterStreak: 3,
  food: true,
  kcal: 640,
  kcalGoal: 2000,
  foodStreak: 0,
  smoking: true,
  cigarettes: 1,
  cigaretteLimit: 4,
  smokeFreeStreak: 6,
  labels: {
    water: 'Water',
    food: 'Food',
    smoking: 'Smoking',
    logFood: 'Log food',
    smoked: 'I smoked one',
    empty: 'Nothing on',
  },
};

describe('quick log widget', () => {
  const quick: QuickLogWidgetProps = { ...snapshot, pendingLog: [] };
  const draw = (props: QuickLogWidgetProps, widgetFamily: string) => quickLogWidget.layout(props, { widgetFamily });

  it('shows one tracker when small and all of them when medium', () => {
    expect(walk(draw(quick, 'systemSmall')).filter((x) => x.type === 'VStack')).toHaveLength(1);
    expect(walk(draw(quick, 'systemMedium')).filter((x) => x.type === 'VStack')).toHaveLength(3);
  });

  it('leaves out trackers that are switched off, and says so when none are on', () => {
    const none = { ...quick, water: false, food: false, smoking: false };

    expect(walk(draw({ ...quick, smoking: false }, 'systemMedium')).filter((x) => x.type === 'VStack')).toHaveLength(2);
    expect(textOf(draw(none, 'systemMedium'))).toContain('Nothing on');
  });

  it('queues a water tap with its time and updates the displayed total', () => {
    const buttons = walk(draw(quick, 'systemMedium')).filter((x) => x.type === 'Button');
    const water = (buttons[0]!.props.onPress as () => Record<string, unknown>)();

    expect(water.waterMl).toBe(1000);
    expect(water.pendingLog).toEqual([{ kind: 'water', amount: 250, at: expect.any(Number) as number }]);
  });

  it('keeps earlier queued taps when another is added', () => {
    const earlier = { kind: 'smoking' as const, amount: 0, at: 1 };
    const buttons = walk(draw({ ...quick, pendingLog: [earlier] }, 'systemMedium')).filter((x) => x.type === 'Button');
    const smoked = (buttons[1]!.props.onPress as () => { cigarettes: number; pendingLog: unknown[] })();

    expect(smoked.cigarettes).toBe(2);
    expect(smoked.pendingLog).toHaveLength(2);
    expect(smoked.pendingLog[0]).toEqual(earlier);
  });

  it('formats water in ounces for imperial users', () => {
    expect(textOf(draw({ ...quick, imperial: true }, 'systemSmall')).some((x) => x.includes('oz'))).toBe(true);
  });

  it('sends food to the add screen instead of logging blind', () => {
    const link = walk(draw(quick, 'systemMedium')).find((x) => x.type === 'Link');

    expect(link?.props.destination).toBe('liftlog://track/food-add');
  });
});

describe('streaks (lock screen) widget', () => {
  const draw = (widgetFamily: string, tracker?: string, props: StreaksWidgetProps = snapshot) =>
    streaksWidget.layout(props, { widgetFamily, configuration: tracker ? { tracker } : undefined });

  it('draws a ring and the streak for the chosen tracker when circular', () => {
    const tree = draw('accessoryCircular', 'water');
    const gauge = walk(tree).find((x) => x.type === 'Gauge')!;

    expect(gauge.props.value).toBeCloseTo(750 / 2000);
    expect(textOf(tree)).toContain('3');
  });

  it('follows the configured tracker', () => {
    expect(textOf(draw('accessoryCircular', 'smoking'))).toContain('6');
    expect(textOf(draw('accessoryInline', 'food'))).toEqual(['🍽️ 640 kcal']);
  });

  it('falls back to the first enabled tracker when the chosen one is off', () => {
    const tree = draw('accessoryInline', 'smoking', { ...snapshot, smoking: false });

    expect(textOf(tree)[0]).toContain('💧');
  });

  it('fills the smoking ring while a day is clean and drains it as the limit is used', () => {
    const ring = (cigarettes: number, cigaretteLimit: number) =>
      walk(draw('accessoryCircular', 'smoking', { ...snapshot, cigarettes, cigaretteLimit })).find(
        (x) => x.type === 'Gauge',
      )!.props.value;

    expect(ring(0, 4)).toBe(1);
    expect(ring(1, 4)).toBe(0.75);
    expect(ring(0, 0)).toBe(1);
    expect(ring(2, 0)).toBe(0);
    expect(ring(9, 4)).toBe(0);
  });

  it('never overfills a ring that has passed its goal', () => {
    const gauge = walk(draw('accessoryCircular', 'water', { ...snapshot, waterMl: 5000 })).find(
      (x) => x.type === 'Gauge',
    )!;

    expect(gauge.props.value).toBe(1);
  });

  it('lists every enabled tracker on one line each when rectangular', () => {
    const lines = textOf(draw('accessoryRectangular'));

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('🔥3');
    expect(lines[1]).not.toContain('🔥');
  });

  it('says so when nothing is switched on', () => {
    expect(
      textOf(draw('accessoryRectangular', undefined, { ...snapshot, water: false, food: false, smoking: false })),
    ).toEqual(['Nothing on']);
  });
});
