import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';
import { gymMembershipsSchema } from '@/db/schema';
import { GymMembership } from '@/models/membership';
import { DatabaseMigrationService } from '@/services/database-migration-service';
import {
  initializeMembershipsStateSlice,
  membershipsReducer,
  type MembershipsState,
  putMembership,
  removeMembership,
  setMembershipsHydrated,
} from '@/store/memberships';
import { applyMembershipsEffects } from '@/store/memberships/effects';
import { createAddEffectTestBed } from '@/utils/__test__/add-effect-testbed';

async function createTestDb(): Promise<ExpoSQLiteDatabase> {
  const expoDb = await openDatabaseAsync(':memory:');
  const db = drizzle(expoDb);
  const migrationService = new DatabaseMigrationService(
    db,
    { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    { importOldData: async () => {} },
  );
  await migrationService.migrate();
  return db;
}

const membership: GymMembership = {
  id: 'm1',
  name: 'City Gym',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  notes: 'Includes pool',
};

describe('memberships effects', () => {
  let db: ExpoSQLiteDatabase;

  function setup() {
    const testBed = createAddEffectTestBed({
      reducer: (state: { memberships: MembershipsState } | undefined, action) => ({
        memberships: membershipsReducer(state?.memberships, action),
      }),
      services: { db, logger: { time: (_: string, fn: () => Promise<void>) => fn() } },
    });
    applyMembershipsEffects(testBed.addEffect);
    return testBed;
  }

  beforeEach(async () => {
    db = await createTestDb();
  });

  it('round-trips a membership, including a missing end date, through the database', async () => {
    const testBed = setup();
    testBed.dispatch(setMembershipsHydrated(true));
    await testBed.dispatchHandled(putMembership(membership));
    await testBed.dispatchHandled(putMembership({ ...membership, id: 'm2', endDate: undefined }));

    const fresh = setup();
    await fresh.dispatchHandled(initializeMembershipsStateSlice());

    expect(fresh.getState().memberships.isHydrated).toBe(true);
    expect(fresh.getState().memberships.memberships).toEqual([
      membership,
      { ...membership, id: 'm2', endDate: undefined },
    ]);
  });

  it('updates an existing membership in place', async () => {
    const testBed = setup();
    testBed.dispatch(setMembershipsHydrated(true));
    await testBed.dispatchHandled(putMembership(membership));
    await testBed.dispatchHandled(putMembership({ ...membership, endDate: undefined, name: 'Renamed' }));

    const rows = await db.select().from(gymMembershipsSchema);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Renamed', endDate: null });
  });

  it('removes a membership', async () => {
    const testBed = setup();
    testBed.dispatch(setMembershipsHydrated(true));
    await testBed.dispatchHandled(putMembership(membership));
    await testBed.dispatchHandled(removeMembership('m1'));

    expect(await db.select().from(gymMembershipsSchema)).toHaveLength(0);
  });

  it('does not write before the slice is hydrated', async () => {
    const testBed = setup();
    await testBed.dispatchHandled(putMembership(membership));

    expect(await db.select().from(gymMembershipsSchema)).toHaveLength(0);
  });
});
