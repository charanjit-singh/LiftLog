import { nextMidnight, pendingLogsToEntries, snapshotForNextDay, WidgetLabels } from '@/models/widget-data';
import { RootState } from '@/store';
import { putSmokeEntry, putWaterEntry } from '@/store/tracking';
import { buildWidgetSnapshot } from '@/store/tracking/widget-snapshot';
import { quickLogWidget, QuickLogWidgetProps } from '@/widgets/quick-log-widget';
import { streaksWidget } from '@/widgets/streaks-widget';
import { LocalDate } from '@js-joda/core';
import { Dispatch } from '@reduxjs/toolkit';
import { TolgeeInstance, TranslationKey } from '@tolgee/react';
import { addUserInteractionListener } from 'expo-widgets';
import { AppState } from 'react-native';

export class WidgetService {
  private started = false;
  /** Refreshes run one at a time: each reads the widget's queue and then overwrites it. */
  private queue: Promise<void> = Promise.resolve();

  constructor(
    readonly getState: () => RootState,
    readonly dispatch: Dispatch,
    readonly tolgee: TolgeeInstance,
  ) {}

  start() {
    if (this.started) {
      return;
    }
    this.started = true;
    // A tap while the app is alive arrives as an event; one while it is not is picked up on the next foreground.
    addUserInteractionListener(() => void this.refresh());
    AppState.addEventListener('change', (state) => state === 'active' && void this.refresh());
    void this.refresh();
  }

  refresh(): Promise<void> {
    this.queue = this.queue.then(() => this.run()).catch(() => {});
    return this.queue;
  }

  private async run() {
    const state = this.getState();
    // Taps are turned into entries by dispatching them, and an entry dispatched before the database has
    // loaded would be lost when it does. Leave the queue where it is until then.
    if (!state.tracking.isHydrated || !state.settings.isHydrated) {
      return;
    }
    await this.drainPendingTaps();

    const today = LocalDate.now();
    const snapshot = buildWidgetSnapshot(this.getState(), today);
    const base = { labels: this.labels(), pendingLog: [] };
    const now: QuickLogWidgetProps = { ...snapshot, ...base };
    const tomorrow: QuickLogWidgetProps = { ...snapshotForNextDay(snapshot, today.plusDays(1)), ...base };
    quickLogWidget.updateTimeline([
      { date: new Date(), props: now },
      { date: nextMidnight(today), props: tomorrow },
    ]);
    // The Lock Screen widget has no buttons, so it needs no queue - just the same two days of numbers.
    streaksWidget.updateTimeline([
      { date: new Date(), props: { ...snapshot, labels: base.labels } },
      { date: nextMidnight(today), props: { ...snapshotForNextDay(snapshot, today.plusDays(1)), labels: base.labels } },
    ]);
  }

  private async drainPendingTaps() {
    const timeline = await quickLogWidget.getTimeline();
    const pending = timeline.flatMap((entry) => entry.props.pendingLog ?? []);
    for (const entry of pendingLogsToEntries(pending)) {
      this.dispatch(
        entry.kind === 'water'
          ? putWaterEntry({ id: entry.id, date: entry.date, ml: entry.ml, loggedAt: entry.loggedAt })
          : putSmokeEntry({ id: entry.id, date: entry.date, loggedAt: entry.loggedAt }),
      );
    }
  }

  private labels(): WidgetLabels {
    const t = (key: TranslationKey) => this.tolgee.t(key);
    return {
      water: t('tracking.water.title'),
      food: t('tracking.food.title'),
      smoking: t('tracking.smoking.title'),
      logFood: t('tracking.food.add.button'),
      smoked: t('tracking.smoking.add.button'),
      empty: t('widget.empty.message'),
    };
  }
}
