import { WidgetLabels } from '@/models/widget-data';
import { RootState } from '@/store';
import { initializeTrackingStateSlice } from '@/store/tracking';
import { buildWidgetSnapshot } from '@/store/tracking/widget-snapshot';
import { quickLogWidgetName, renderSnapshot } from '@/widgets/android/task-handler';
import { saveLabels } from '@/widgets/android/widget-storage';
import { LocalDate } from '@js-joda/core';
import { Dispatch } from '@reduxjs/toolkit';
import { TolgeeInstance, TranslationKey } from '@tolgee/react';
import { AppState } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

export class WidgetService {
  private started = false;
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
    // A widget tap writes to the database while the app may be asleep, so Redux is stale on return.
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        this.dispatch(initializeTrackingStateSlice());
      }
    });
  }

  refresh(): Promise<void> {
    this.queue = this.queue.then(() => this.run()).catch(() => {});
    return this.queue;
  }

  private async run() {
    const state = this.getState();
    if (!state.tracking.isHydrated || !state.settings.isHydrated) {
      return;
    }
    const labels = this.labels();
    // The headless tap handler has no i18n, so it reads the translated labels the app leaves behind.
    await saveLabels(labels);
    const snapshot = buildWidgetSnapshot(state, LocalDate.now());
    await requestWidgetUpdate({
      widgetName: quickLogWidgetName,
      renderWidget: (info) => renderSnapshot(snapshot, labels, info.width),
    });
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
