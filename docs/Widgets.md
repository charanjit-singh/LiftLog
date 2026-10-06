# Home-screen widgets

A **Quick log** widget on iOS and Android shows today's water, food and smoking and lets you log water or a
cigarette with one tap, without opening the app. Food opens the add-food screen instead, since a meal needs
a name and a number. It follows the [daily trackers](./Tracking.md): a tracker you have switched off does not
appear, and a small iOS widget shows the first tracker only.

The two platforms work differently because the platforms allow different things.

|                         | iOS                                                          | Android                                                       |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| Library                 | `expo-widgets` (SwiftUI via `@expo/ui`)                      | `react-native-android-widget`                                 |
| Widget code             | `src/widgets/quick-log-widget.tsx`                           | `src/widgets/android/`                                        |
| Where a tap runs        | Widget extension - cannot see the app's database             | A headless JS task - can open the database directly           |
| How a tap is saved      | Queued in the widget's own props, written by the app later   | Written straight to SQLite                                    |
| How the app catches up  | Drains the queue when it starts, comes to the foreground, or receives the tap event | Reloads tracking from SQLite when it comes to the foreground |
| Service                 | `services/widget-service.ios.ts`                             | `services/widget-service.android.tsx`                         |

## Shared pieces

- `models/widget-data.ts` - the flat `WidgetSnapshot` a widget displays, the pending-tap queue and how it
  becomes entries (ids are derived from the tap, so replaying a queue cannot duplicate), and the next-day rollover.
- `store/tracking/widget-snapshot.ts` - builds a snapshot from `tracking` and `settings` only, so Android's
  headless handler can build one from disk.
- `store/widgets/effects.ts` - refreshes the widgets when any tracking data, tracker switch or goal changes,
  once data has loaded.

## iOS notes

- The widget function is stringified by the Expo babel preset (the `'widget'` directive) and runs in the
  extension's own JavaScript runtime. It can use nothing from the app - no imports, helpers or state - only
  the injected UI components and its `props`. Translated labels therefore arrive as props.
- Taps are reconciled using the time of the tap, so a cigarette tapped at 23:55 stays on that day even if the
  app is not opened until morning. The timeline also carries a second entry at midnight that zeroes the totals.
- `expo-widgets` requires `@expo/ui` at the same patch level, so keep them in step.

## Android notes

- `index.js` is the app entry and imports `src/widgets/register-widgets` first, so the tap handler is
  registered even when Android starts the app headless for a widget tap.
- The handler has no i18n, so the app saves its translated labels (`widgetLabels`) for the widget to read.
- A tap while the database has not been migrated yet (a fresh install never opened) shows the empty state.

## Lock Screen widgets

- **iOS** - a second widget, **Streaks** (`src/widgets/streaks-widget.tsx`), in the three accessory sizes. Circular
  shows a ring and the streak for one tracker, inline shows one line, rectangular lists every enabled tracker.
  It has no buttons: the Lock Screen is for glancing, and a tap opens the Track tab. Long-press the widget and
  choose **Edit Widget** to pick the tracker for circular and inline. The smoking ring is full while the day is
  clean and drains as a limit is used. It is refreshed alongside Quick log, from the same snapshot.
- **Android** - there is no separate widget. `plugins/android-widget-lockscreen.js` adds the `keyguard`
  category to Quick log's provider, so it can be placed on the lock screen where the OS allows it (tablets and
  recent Android versions); older versions ignore the extra category. The plugin must be listed _before_
  `react-native-android-widget` in `app.json`, because Expo runs mods in reverse order.
- The tracker names in the iOS Edit Widget picker are fixed English text from `app.json`; widget configuration
  cannot be translated from the app.
- `src/widgets/widget-layouts.spec.tsx` loads both iOS layouts with the native UI stubbed out and checks what
  they draw and what their buttons queue.

## Known limits

- Both platforms are verified by bundling with Metro and running `expo prebuild`, plus unit tests for the shared
  logic. They have not been run on a device or simulator, which needs a macOS or Android build.
- iOS: a tap that lands in the instant between the app reading and rewriting the widget's queue can be lost.
- Android: while the app is open in the background, the widget and the app only agree again when the app is
  next foregrounded.
