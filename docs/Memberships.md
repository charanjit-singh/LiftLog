# Gym memberships

Records when each gym membership starts and ends. Reached from Settings → Gym membership.

- **Model** - `app/src/models/membership.ts`. Dates are ISO local dates (`yyyy-MM-dd`); no `endDate`
  means ongoing. Status (`upcoming` / `active` / `ended`) and days remaining are derived from today's
  date, never stored.
- **Storage** - the `gym_membership` table (`app/src/db/schema.ts`). Plain columns rather than the usual
  `id` + JSON `payload`, since a membership is a few scalars with no versioned shape. Because it lives in
  SQLite it is included in backups and restores (see [Storage.md](./Storage.md)).
- **State** - `app/src/store/memberships/`. A reducer holds the list; effects hydrate it at startup and
  write `putMembership` / `removeMembership` back, guarded by `isHydrated`.
- **UI** - `app/src/app/(tabs)/settings/memberships/`. The editor is opened on a freshly created row and
  removes it again on exit if it was never named, the same way the backends editor works.
