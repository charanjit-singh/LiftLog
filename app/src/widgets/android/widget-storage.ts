import { foodLogSchema, smokingLogSchema, waterLogSchema } from '@/db/schema';
import { defaultWidgetLabels, WidgetLabels, widgetLabelsStorageKey } from '@/models/widget-data';
import { KeyValueStore } from '@/services/key-value-store';
import { PreferenceService } from '@/services/preference-service';
import { WidgetSnapshotState } from '@/store/tracking/widget-snapshot';
import { Instant, LocalDate } from '@js-joda/core';
import { drizzle, ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';

// The widget's tap handler runs as a headless task that may start a fresh JS runtime with no app, no
// Redux store and no services. Everything it needs is therefore read straight from disk here, through the
// same preference files and database the app uses.

let database: Promise<ExpoSQLiteDatabase> | undefined;
function openDb() {
  return (database ??= openDatabaseAsync('db.db').then((expoDb) => drizzle(expoDb)));
}

const keyValueStore = new KeyValueStore();
const preferences = new PreferenceService(keyValueStore);

export async function loadWidgetState(): Promise<WidgetSnapshotState> {
  const db = await openDb();
  const [water, smoking, food] = await Promise.all([
    db.select().from(waterLogSchema),
    db.select().from(smokingLogSchema),
    db.select().from(foodLogSchema),
  ]);
  const [
    useImperialUnits,
    trackWater,
    trackFood,
    trackSmoking,
    waterGoalMl,
    calorieGoal,
    smokingDailyLimit,
    smokingTrackingSince,
  ] = await Promise.all([
    preferences.getPreference('useImperialUnits'),
    preferences.getPreference('trackWater'),
    preferences.getPreference('trackFood'),
    preferences.getPreference('trackSmoking'),
    preferences.getPreference('waterGoalMl'),
    preferences.getPreference('calorieGoal'),
    preferences.getPreference('smokingDailyLimit'),
    preferences.getPreference('smokingTrackingSince'),
  ]);
  // Only the fields the snapshot reads exist here; the rest of the app's state is irrelevant to a widget.
  return {
    tracking: { water, smoking, food, savedFoods: [], isHydrated: true },
    settings: {
      useImperialUnits,
      trackWater,
      trackFood,
      trackSmoking,
      waterGoalMl,
      calorieGoal,
      smokingDailyLimit,
      smokingTrackingSince,
    },
  } as unknown as WidgetSnapshotState;
}

export async function recordWater(ml: number) {
  const db = await openDb();
  const now = Instant.now();
  await db.insert(waterLogSchema).values({
    // No uuid: the random-values polyfill is not guaranteed to be loaded in a headless runtime.
    id: `widget-water-${now.toEpochMilli()}`,
    date: LocalDate.now().toString(),
    ml,
    loggedAt: now.toString(),
  });
}

export async function recordCigarette() {
  const db = await openDb();
  const now = Instant.now();
  await db.insert(smokingLogSchema).values({
    id: `widget-smoking-${now.toEpochMilli()}`,
    date: LocalDate.now().toString(),
    loggedAt: now.toString(),
  });
}

export async function loadLabels(): Promise<WidgetLabels> {
  try {
    const stored = await keyValueStore.getItem(widgetLabelsStorageKey);
    return stored ? { ...defaultWidgetLabels, ...(JSON.parse(stored) as Partial<WidgetLabels>) } : defaultWidgetLabels;
  } catch {
    return defaultWidgetLabels;
  }
}

export async function saveLabels(labels: WidgetLabels) {
  await keyValueStore.setItem(widgetLabelsStorageKey, JSON.stringify(labels));
}
