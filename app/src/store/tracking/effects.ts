import { foodLogSchema, savedFoodSchema, smokingLogSchema, waterLogSchema } from '@/db/schema';
import { FoodEntry, SavedFood } from '@/models/tracking';
import {
  initializeTrackingStateSlice,
  putFoodEntry,
  rememberSavedFood,
  putSmokeEntry,
  putWaterEntry,
  removeFoodEntry,
  removeSavedFood,
  removeSmokeEntry,
  removeWaterEntry,
  setTracking,
  setTrackingHydrated,
} from '@/store/tracking';
import { AddEffectFn } from '@/store/store';
import { eq } from 'drizzle-orm';
import { uuid } from '@/utils/uuid';

/** Two entries with the same name in different case are the same food. */
const foodKey = (name: string) => name.trim().toLowerCase();

export function applyTrackingEffects(addEffect: AddEffectFn) {
  addEffect(initializeTrackingStateSlice, async (_, { cancelActiveListeners, dispatch, extra: { db, logger } }) => {
    cancelActiveListeners();
    await logger.time('initializeTracking', async () => {
      const [water, smoking, food, savedFoods] = await Promise.all([
        db.select().from(waterLogSchema),
        db.select().from(smokingLogSchema),
        db.select().from(foodLogSchema),
        db.select().from(savedFoodSchema),
      ]);
      dispatch(setTracking({ water, smoking, food, savedFoods }));
      dispatch(setTrackingHydrated(true));
    });
  });

  addEffect(putWaterEntry, async (action, { stateAfterReduce, extra: { db } }) => {
    if (!stateAfterReduce.tracking.isHydrated) return;
    const { id, ...values } = action.payload;
    await db
      .insert(waterLogSchema)
      .values({ id, ...values })
      .onConflictDoUpdate({ target: waterLogSchema.id, set: values });
  });
  addEffect(removeWaterEntry, async (action, { stateAfterReduce, extra: { db } }) => {
    if (!stateAfterReduce.tracking.isHydrated) return;
    await db.delete(waterLogSchema).where(eq(waterLogSchema.id, action.payload));
  });

  addEffect(putSmokeEntry, async (action, { stateAfterReduce, extra: { db } }) => {
    if (!stateAfterReduce.tracking.isHydrated) return;
    const { id, ...values } = action.payload;
    await db
      .insert(smokingLogSchema)
      .values({ id, ...values })
      .onConflictDoUpdate({ target: smokingLogSchema.id, set: values });
  });
  addEffect(removeSmokeEntry, async (action, { stateAfterReduce, extra: { db } }) => {
    if (!stateAfterReduce.tracking.isHydrated) return;
    await db.delete(smokingLogSchema).where(eq(smokingLogSchema.id, action.payload));
  });

  addEffect(putFoodEntry, async (action, { stateAfterReduce, stateBeforeReduce, dispatch, extra: { db } }) => {
    if (!stateAfterReduce.tracking.isHydrated) return;
    const { id, ...values } = action.payload;
    await db
      .insert(foodLogSchema)
      .values({ id, ...values })
      .onConflictDoUpdate({ target: foodLogSchema.id, set: values });
    // Only a food that is newly logged teaches the app; editing an entry must not inflate its use count.
    const isNew = !stateBeforeReduce.tracking.food.some((x) => x.id === action.payload.id);
    if (isNew && action.payload.name.trim()) {
      const saved = rememberFood(action.payload, stateAfterReduce.tracking.savedFoods);
      const { id: _savedId, ...savedValues } = saved;
      await db
        .insert(savedFoodSchema)
        .values(saved)
        .onConflictDoUpdate({ target: savedFoodSchema.id, set: savedValues });
      dispatch(rememberSavedFood(saved));
    }
  });
  addEffect(removeFoodEntry, async (action, { stateAfterReduce, extra: { db } }) => {
    if (!stateAfterReduce.tracking.isHydrated) return;
    await db.delete(foodLogSchema).where(eq(foodLogSchema.id, action.payload));
  });

  addEffect(removeSavedFood, async (action, { stateAfterReduce, extra: { db } }) => {
    if (!stateAfterReduce.tracking.isHydrated) return;
    await db.delete(savedFoodSchema).where(eq(savedFoodSchema.id, action.payload));
  });
}

/**
 * Logging a food teaches the app about it, so the next time is one tap. An existing saved food is bumped
 * (and takes the latest numbers, since people fix a recipe over time); unnamed quick-add calories are not
 * worth remembering.
 */
function rememberFood(entry: FoodEntry, saved: SavedFood[]): SavedFood {
  const existing = saved.find((x) => foodKey(x.name) === foodKey(entry.name));
  return {
    id: existing?.id ?? uuid(),
    name: entry.name.trim(),
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    lastUsedAt: entry.loggedAt,
    useCount: (existing?.useCount ?? 0) + 1,
  };
}
