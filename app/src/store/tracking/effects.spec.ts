import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';
import { foodLogSchema, savedFoodSchema, smokingLogSchema, waterLogSchema } from '@/db/schema';
import { FoodEntry } from '@/models/tracking';
import { DatabaseMigrationService } from '@/services/database-migration-service';
import {
  initializeTrackingStateSlice,
  putFoodEntry,
  putSmokeEntry,
  putWaterEntry,
  removeWaterEntry,
  setTrackingHydrated,
  trackingReducer,
  type TrackingState,
} from '@/store/tracking';
import { applyTrackingEffects } from '@/store/tracking/effects';
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

const lunch: FoodEntry = {
  id: 'f1',
  date: '2026-10-10',
  meal: 'lunch',
  name: 'Chicken Salad',
  calories: 350,
  protein: 30,
  carbs: 10,
  fat: 12,
  loggedAt: '2026-10-10T12:00:00Z',
};

describe('tracking effects', () => {
  let db: ExpoSQLiteDatabase;

  function setup() {
    const testBed = createAddEffectTestBed({
      reducer: (state: { tracking: TrackingState } | undefined, action) => ({
        tracking: trackingReducer(state?.tracking, action),
      }),
      services: { db, logger: { time: (_: string, fn: () => Promise<void>) => fn() } },
    });
    applyTrackingEffects(testBed.addEffect);
    testBed.dispatch(setTrackingHydrated(true));
    return testBed;
  }

  beforeEach(async () => {
    db = await createTestDb();
  });

  it('persists and removes water entries', async () => {
    const testBed = setup();
    await testBed.dispatchHandled(putWaterEntry({ id: 'w1', date: '2026-10-10', ml: 250, loggedAt: 'x' }));
    expect(await db.select().from(waterLogSchema)).toHaveLength(1);

    await testBed.dispatchHandled(removeWaterEntry('w1'));
    expect(await db.select().from(waterLogSchema)).toHaveLength(0);
  });

  it('persists cigarettes', async () => {
    const testBed = setup();
    await testBed.dispatchHandled(putSmokeEntry({ id: 's1', date: '2026-10-10', loggedAt: 'x' }));

    expect(await db.select().from(smokingLogSchema)).toHaveLength(1);
  });

  it('learns a food when it is logged, and counts repeat meals case-insensitively', async () => {
    const testBed = setup();
    await testBed.dispatchHandled(putFoodEntry(lunch));
    await testBed.dispatchHandled(putFoodEntry({ ...lunch, id: 'f2', name: 'chicken salad ' }));

    const saved = await db.select().from(savedFoodSchema);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: 'chicken salad', useCount: 2, calories: 350 });
  });

  it('does not inflate the count when an existing entry is edited', async () => {
    const testBed = setup();
    await testBed.dispatchHandled(putFoodEntry(lunch));
    await testBed.dispatchHandled(putFoodEntry({ ...lunch, calories: 400 }));

    expect((await db.select().from(foodLogSchema))[0]!.calories).toBe(400);
    expect((await db.select().from(savedFoodSchema))[0]!.useCount).toBe(1);
  });

  it('does not remember unnamed quick-add calories', async () => {
    const testBed = setup();
    await testBed.dispatchHandled(putFoodEntry({ ...lunch, name: '' }));

    expect(await db.select().from(foodLogSchema)).toHaveLength(1);
    expect(await db.select().from(savedFoodSchema)).toHaveLength(0);
  });

  it('hydrates everything back from the database', async () => {
    const first = setup();
    await first.dispatchHandled(putFoodEntry(lunch));
    await first.dispatchHandled(putWaterEntry({ id: 'w1', date: '2026-10-10', ml: 250, loggedAt: 'x' }));

    const fresh = createAddEffectTestBed({
      reducer: (state: { tracking: TrackingState } | undefined, action) => ({
        tracking: trackingReducer(state?.tracking, action),
      }),
      services: { db, logger: { time: (_: string, fn: () => Promise<void>) => fn() } },
    });
    applyTrackingEffects(fresh.addEffect);
    await fresh.dispatchHandled(initializeTrackingStateSlice());

    const { tracking } = fresh.getState();
    expect(tracking.isHydrated).toBe(true);
    expect(tracking.food).toEqual([lunch]);
    expect(tracking.water).toHaveLength(1);
    expect(tracking.savedFoods).toHaveLength(1);
  });

  it('does not write before hydration', async () => {
    const testBed = createAddEffectTestBed({
      reducer: (state: { tracking: TrackingState } | undefined, action) => ({
        tracking: trackingReducer(state?.tracking, action),
      }),
      services: { db },
    });
    applyTrackingEffects(testBed.addEffect);
    await testBed.dispatchHandled(putWaterEntry({ id: 'w1', date: '2026-10-10', ml: 250, loggedAt: 'x' }));

    expect(await db.select().from(waterLogSchema)).toHaveLength(0);
  });
});
