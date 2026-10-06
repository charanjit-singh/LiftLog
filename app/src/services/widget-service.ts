import { RootState } from '@/store';
import { Dispatch } from '@reduxjs/toolkit';
import { TolgeeInstance } from '@tolgee/react';

/**
 * Keeps the home-screen widgets in step with the trackers. This is the no-op used where there are no
 * widgets (web, tests); see `widget-service.ios.ts` and `widget-service.android.ts`.
 */
export class WidgetService {
  constructor(
    readonly getState: () => RootState,
    readonly dispatch: Dispatch,
    readonly tolgee: TolgeeInstance,
  ) {}

  /** Begins listening for the app returning to the foreground, and for taps on a widget. Safe to call twice. */
  start() {}

  /** Brings the widgets up to date with the app's state. */
  async refresh() {}
}
