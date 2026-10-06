import { gymMembershipsSchema } from '@/db/schema';
import { GymMembership } from '@/models/membership';
import {
  initializeMembershipsStateSlice,
  putMembership,
  removeMembership,
  setMemberships,
  setMembershipsHydrated,
} from '@/store/memberships';
import { AddEffectFn } from '@/store/store';
import { eq } from 'drizzle-orm';

export function applyMembershipsEffects(addEffect: AddEffectFn) {
  addEffect(initializeMembershipsStateSlice, async (_, { cancelActiveListeners, dispatch, extra: { db, logger } }) => {
    cancelActiveListeners();
    await logger.time('initializeMemberships', async () => {
      const rows = await db.select().from(gymMembershipsSchema);
      const memberships: GymMembership[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        startDate: row.startDate,
        endDate: row.endDate ?? undefined,
        notes: row.notes,
      }));
      dispatch(setMemberships(memberships));
      dispatch(setMembershipsHydrated(true));
    });
  });

  addEffect(putMembership, async (action, { stateAfterReduce, extra: { db } }) => {
    if (!stateAfterReduce.memberships.isHydrated) {
      return;
    }
    const { id, name, startDate, endDate, notes } = action.payload;
    const values = { name, startDate, endDate: endDate ?? null, notes };
    await db
      .insert(gymMembershipsSchema)
      .values({ id, ...values })
      .onConflictDoUpdate({ target: gymMembershipsSchema.id, set: values });
  });

  addEffect(removeMembership, async (action, { stateAfterReduce, extra: { db } }) => {
    if (!stateAfterReduce.memberships.isHydrated) {
      return;
    }
    await db.delete(gymMembershipsSchema).where(eq(gymMembershipsSchema.id, action.payload));
  });
}
