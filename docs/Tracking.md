# Daily tracking: water, food, smoking

The **Track** tab is a one-screen daily dashboard. Each tracker is opt-in (Settings → Daily tracking) and has
the same shape: a ring for today, a streak, a month calendar, and a day list you can back-fill by tapping a
calendar day.

| Tracker | One-tap action                              | Streak counts                                  | Goal                     |
| ------- | ------------------------------------------- | ---------------------------------------------- | ------------------------ |
| Water   | `+250 ml` (or the imperial equivalent)      | days that reached the water goal               | `waterGoalMl`            |
| Food    | tap a saved food, or just type calories     | days with anything logged                      | calories + macro targets |
| Smoking | `I smoked one`                              | smoke-free days (or days at/under a set limit) | `smokingDailyLimit`      |

- **Pure logic** - `app/src/models/tracking.ts`: entry types, macro maths, `computeStreaks`, and the 0-4 level a
  day earns on the calendar. A "do something" streak (water, food) survives an unfinished _today_; a "don't do
  something" streak (smoking) ends the moment today goes wrong, and only counts days since
  `smokingTrackingSince` so history from before tracking is never counted as smoke-free.
- **Storage** - plain-column tables `water_log`, `smoking_log`, `food_log`, `saved_food` (`app/src/db/schema.ts`),
  so they are included in backups. Goals and toggles are preferences in `store/settings/registry.ts`.
- **State** - `app/src/store/tracking/`: the slice and persistence effects (`index.ts`, `effects.ts`), the
  derived streaks and calendar months (`derived.ts`), and the action builders screens use to log (`log.ts`).
  Logging a named food also saves it (`saved_food`), so the next time is one tap; editing an entry does not
  inflate its use count.
- **Calendar** - reuses the workout `ActivityCalendar`; `selectTrackerMonth` grades each day for the tracker.
- **UI** - `app/src/app/(tabs)/track/` (dashboard, `water`, `food`, `food-add`, `smoking`) and
  `settings/tracking.tsx`.
- **Reminders** - see [GymReminders.md](./GymReminders.md). A separate switch covers water and meal check-ins
  and smoke-free milestone notifications.

## Not built yet

There is no built-in food database or barcode scanner. Foods are the ones you create, and logging them is made
quick rather than searching a catalogue. An online lookup (for example Open Food Facts) and a barcode scan would
both add network and camera dependencies and are a separate decision.
