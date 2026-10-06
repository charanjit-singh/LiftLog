import { MealType, Macros } from '@/models/tracking';
import { putFoodEntry, putSmokeEntry, putWaterEntry } from '@/store/tracking';
import { uuid } from '@/utils/uuid';
import { Instant, LocalDate } from '@js-joda/core';

// Action builders for logging, so every screen stamps entries the same way. `date` is the day the entry
// belongs to, which is not always today: the calendar lets people back-fill a day they forgot.

export const logWater = (ml: number, date: LocalDate) =>
  putWaterEntry({ id: uuid(), date: date.toString(), ml, loggedAt: Instant.now().toString() });

export const logCigarette = (date: LocalDate) =>
  putSmokeEntry({ id: uuid(), date: date.toString(), loggedAt: Instant.now().toString() });

export const logFood = (input: { name: string; meal: MealType; date: LocalDate } & Macros) =>
  putFoodEntry({
    id: uuid(),
    date: input.date.toString(),
    meal: input.meal,
    name: input.name.trim(),
    calories: Math.round(input.calories),
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    loggedAt: Instant.now().toString(),
  });
