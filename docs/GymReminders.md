# Gym reminders

Opt-in local notifications (Settings → Notifications → Gym reminders): a witty nudge when you skip the
gym, and a heads-up before a [membership](./Memberships.md) ends.

- **Planning** - `app/src/models/gym-reminders.ts` is a pure function of the clock, the last finished
  workout, the memberships and the settings. It returns what should be scheduled over the next 14 days.
  Nudges start once `gymReminderMissedDays` have passed without a workout (default 2), arrive at
  `gymReminderHour` (default 18:00), and stop a week later. Membership warnings go out 3 days before the end
  date and on it. The joke for a given date is fixed, so replanning never reshuffles messages.
- **Scheduling** - `app/src/services/gym-reminder-service.ts` cancels every notification whose id starts
  with `gym-reminder-` and schedules the plan. The app cannot run in the background to decide whether to
  nag, so the plan is replaced whenever it could change: on launch, when a workout finishes or is deleted,
  and when the settings or memberships change. Opening the app after a workout is what silences the nudges.
- **Wiring** - `app/src/store/gym-reminders/effects.ts`. It waits until settings, sessions and memberships
  have all hydrated, so a half-loaded state cannot wipe correct reminders.
- **Messages** - the witty copy lives in `en.json` as `gym_reminders.nudge.<n>.title/body`; the key list is in
  `models/gym-reminder-messages.ts`. Add a message by adding both keys and a list entry.
- **Permission** - requested when the user turns the switch on; a refusal leaves it off.
