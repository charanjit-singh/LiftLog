import FullHeightScrollView from '@/components/layout/full-height-scroll-view';
import IconButton from '@/components/presentation/foundation/icon-button';
import SegmentedPicker from '@/components/presentation/foundation/segmented-picker';
import { SurfaceText } from '@/components/presentation/foundation/surface-text';
import TouchableRipple from '@/components/presentation/foundation/touchable-ripple';
import { rounding, spacing, useAppTheme } from '@/hooks/useAppTheme';
import { MealType, mealForHour, mealTypes, SavedFood, scaleMacros } from '@/models/tracking';
import { useAppSelector } from '@/store';
import { removeSavedFood, selectRecentFoods } from '@/store/tracking';
import { logFood } from '@/store/tracking/log';
import { LocalDate, LocalDateTime } from '@js-joda/core';
import { useTranslate } from '@tolgee/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Button from '@/components/presentation/foundation/button';
import { Chip, TextInput } from 'react-native-paper';
import { useDispatch } from 'react-redux';

const servingOptions = [0.5, 1, 1.5, 2];

const parseNumber = (text: string) => {
  const parsed = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export default function FoodAddPage() {
  const { t } = useTranslate();
  const { back } = useRouter();
  const dispatch = useDispatch();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const date = params.date ? LocalDate.parse(params.date) : LocalDate.now();
  const [meal, setMeal] = useState<MealType>(params.meal ?? mealForHour(LocalDateTime.now().hour()));
  const [servings, setServings] = useState(1);
  const [search, setSearch] = useState('');
  const [quickCalories, setQuickCalories] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const recents = useAppSelector(selectRecentFoods);

  const matches = recents.filter((x) => x.name.toLowerCase().includes(search.trim().toLowerCase()));

  const logSaved = (food: SavedFood) => {
    const macros = scaleMacros(food, servings);
    dispatch(logFood({ name: food.name, meal, date, ...macros }));
    back();
  };

  const logQuick = () => {
    dispatch(logFood({ name: '', meal, date, calories: parseNumber(quickCalories), protein: 0, carbs: 0, fat: 0 }));
    back();
  };

  const logNew = () => {
    dispatch(
      logFood({
        name,
        meal,
        date,
        calories: parseNumber(calories),
        protein: parseNumber(protein),
        carbs: parseNumber(carbs),
        fat: parseNumber(fat),
      }),
    );
    back();
  };

  return (
    <FullHeightScrollView
      avoidKeyboard
      contentContainerStyle={{ gap: spacing[4], padding: spacing.pageHorizontalMargin }}
    >
      <Stack.Screen options={{ title: t('tracking.food.add.title') }} />

      <SegmentedPicker
        value={meal}
        options={mealTypes.map((value) => ({ value, label: t(`tracking.food.meal.${value}.label`) }))}
        onChange={setMeal}
      />

      <View style={{ gap: spacing[2] }}>
        <SurfaceText font="text-lg" weight="bold">
          {t('tracking.food.quick_add.label')}
        </SurfaceText>
        <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'center' }}>
          <TextInput
            mode="outlined"
            style={{ flex: 1 }}
            label={t('tracking.food.calories.label')}
            keyboardType="numeric"
            value={quickCalories}
            onChangeText={setQuickCalories}
            onSubmitEditing={logQuick}
          />
          <Button mode="contained" disabled={!parseNumber(quickCalories)} onPress={logQuick}>
            {t('tracking.add.button')}
          </Button>
        </View>
      </View>

      <View style={{ gap: spacing[2] }}>
        <SurfaceText font="text-lg" weight="bold">
          {t('tracking.food.recent.label')}
        </SurfaceText>
        <TextInput
          mode="outlined"
          label={t('tracking.food.search.label')}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'center' }}>
          <SurfaceText font="text-sm" color="onSurfaceVariant">
            {t('tracking.food.servings.label')}
          </SurfaceText>
          {servingOptions.map((option) => (
            <Chip key={option} selected={servings === option} onPress={() => setServings(option)}>
              {option.toString()}
            </Chip>
          ))}
        </View>
        {matches.length === 0 && (
          <SurfaceText color="onSurfaceVariant">
            {recents.length === 0 ? t('tracking.food.no_recent.message') : t('tracking.food.no_match.message')}
          </SurfaceText>
        )}
        {matches.map((food) => {
          const scaled = scaleMacros(food, servings);
          return (
            <View
              key={food.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: rounding.roundedRectangleRadius,
                backgroundColor: colors.surfaceContainer,
                overflow: 'hidden',
              }}
            >
              <TouchableRipple style={{ flex: 1 }} onPress={() => logSaved(food)}>
                <View style={{ padding: spacing[3] }}>
                  <SurfaceText numberOfLines={1}>{food.name}</SurfaceText>
                  <SurfaceText font="text-xs" color="onSurfaceVariant">
                    {`${scaled.calories} kcal · P ${Math.round(scaled.protein)} · C ${Math.round(scaled.carbs)} · F ${Math.round(scaled.fat)}`}
                  </SurfaceText>
                </View>
              </TouchableRipple>
              <IconButton icon="close" size={18} onPress={() => dispatch(removeSavedFood(food.id))} />
            </View>
          );
        })}
      </View>

      {showNew ? (
        <View style={{ gap: spacing[2] }}>
          <SurfaceText font="text-lg" weight="bold">
            {t('tracking.food.new.label')}
          </SurfaceText>
          <TextInput mode="outlined" label={t('tracking.food.name.label')} value={name} onChangeText={setName} />
          <TextInput
            mode="outlined"
            label={t('tracking.food.calories.label')}
            keyboardType="numeric"
            value={calories}
            onChangeText={setCalories}
          />
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <TextInput
              mode="outlined"
              style={{ flex: 1 }}
              label={t('tracking.food.protein.label')}
              keyboardType="numeric"
              value={protein}
              onChangeText={setProtein}
            />
            <TextInput
              mode="outlined"
              style={{ flex: 1 }}
              label={t('tracking.food.carbs.label')}
              keyboardType="numeric"
              value={carbs}
              onChangeText={setCarbs}
            />
            <TextInput
              mode="outlined"
              style={{ flex: 1 }}
              label={t('tracking.food.fat.label')}
              keyboardType="numeric"
              value={fat}
              onChangeText={setFat}
            />
          </View>
          <Button mode="contained" disabled={!name.trim() || !parseNumber(calories)} onPress={logNew}>
            {t('tracking.food.save_and_log.button')}
          </Button>
        </View>
      ) : (
        <Button mode="outlined" onPress={() => setShowNew(true)}>
          {t('tracking.food.new.button')}
        </Button>
      )}
    </FullHeightScrollView>
  );
}
