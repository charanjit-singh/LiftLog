import { DateKey, FoodEntry, SavedFood, SmokeEntry, WaterEntry } from '@/models/tracking';
import { createAction, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TrackingState {
  water: WaterEntry[];
  smoking: SmokeEntry[];
  food: FoodEntry[];
  savedFoods: SavedFood[];
  isHydrated: boolean;
}

export const initialTrackingState: TrackingState = {
  water: [],
  smoking: [],
  food: [],
  savedFoods: [],
  isHydrated: false,
};

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((x) => x.id === item.id);
  if (index === -1) {
    items.push(item);
  } else {
    items[index] = item;
  }
}

const trackingSlice = createSlice({
  name: 'tracking',
  initialState: initialTrackingState,
  reducers: {
    setTracking(state, action: PayloadAction<Omit<TrackingState, 'isHydrated'>>) {
      Object.assign(state, action.payload);
    },
    setTrackingHydrated(state, action: PayloadAction<boolean>) {
      state.isHydrated = action.payload;
    },
    putWaterEntry(state, action: PayloadAction<WaterEntry>) {
      upsertById(state.water, action.payload);
    },
    removeWaterEntry(state, action: PayloadAction<string>) {
      state.water = state.water.filter((x) => x.id !== action.payload);
    },
    putSmokeEntry(state, action: PayloadAction<SmokeEntry>) {
      upsertById(state.smoking, action.payload);
    },
    removeSmokeEntry(state, action: PayloadAction<string>) {
      state.smoking = state.smoking.filter((x) => x.id !== action.payload);
    },
    putFoodEntry(state, action: PayloadAction<FoodEntry>) {
      upsertById(state.food, action.payload);
    },
    removeFoodEntry(state, action: PayloadAction<string>) {
      state.food = state.food.filter((x) => x.id !== action.payload);
    },
    /** State only: the effect that learns a food has already written it to the database. */
    rememberSavedFood(state, action: PayloadAction<SavedFood>) {
      upsertById(state.savedFoods, action.payload);
    },
    removeSavedFood(state, action: PayloadAction<string>) {
      state.savedFoods = state.savedFoods.filter((x) => x.id !== action.payload);
    },
  },
  selectors: {
    selectWaterEntries: (state) => state.water,
    selectSmokeEntries: (state) => state.smoking,
    selectFoodEntries: (state) => state.food,
    selectSavedFoods: (state) => state.savedFoods,
  },
});

export const initializeTrackingStateSlice = createAction('initializeTrackingStateSlice');

export const {
  setTracking,
  setTrackingHydrated,
  putWaterEntry,
  removeWaterEntry,
  putSmokeEntry,
  removeSmokeEntry,
  putFoodEntry,
  removeFoodEntry,
  rememberSavedFood,
  removeSavedFood,
} = trackingSlice.actions;

export const { selectWaterEntries, selectSmokeEntries, selectFoodEntries, selectSavedFoods } = trackingSlice.selectors;

export const trackingReducer = trackingSlice.reducer;

/** Foods ordered for a "log again" shelf: what the user eats most, then most recently. */
export const selectRecentFoods = createSelector([selectSavedFoods], (foods) =>
  [...foods].sort((a, b) => b.useCount - a.useCount || b.lastUsedAt.localeCompare(a.lastUsedAt)),
);

export const selectFoodEntriesOnDate = createSelector(
  [selectFoodEntries, (_: { tracking: TrackingState }, date: DateKey) => date],
  (entries, date) => entries.filter((x) => x.date === date),
);
