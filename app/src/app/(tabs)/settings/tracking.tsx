import { SettingsPage } from '@/components/layout/settings-page';
import { IntegerEditor } from '@/components/presentation/foundation/editors/integer-editor';
import { FormRow } from '@/components/presentation/foundation/form-row';
import { SegmentedGroup } from '@/components/presentation/foundation/segmented-list';
import { SegmentedListSwitch } from '@/components/presentation/foundation/segmented-list-switch';
import { useToday } from '@/hooks/useToday';
import { useAppSelector } from '@/store';
import {
  setCalorieGoal,
  setCarbsGoalGrams,
  setFatGoalGrams,
  setProteinGoalGrams,
  setSmokingCigarettePriceCents,
  setSmokingDailyLimit,
  setSmokingTrackingSince,
  setTrackFood,
  setTrackSmoking,
  setTrackWater,
  setWaterGoalMl,
} from '@/store/settings';
import { useTranslate } from '@tolgee/react';
import { useState } from 'react';
import { TextInput } from 'react-native-paper';
import { useDispatch } from 'react-redux';

const mlPerOunce = 29.5735;

export default function TrackingSettingsPage() {
  const { t } = useTranslate();
  const dispatch = useDispatch();
  const today = useToday();
  const settings = useAppSelector((s) => s.settings);
  const imperial = settings.useImperialUnits;
  const [price, setPrice] = useState(
    settings.smokingCigarettePriceCents ? (settings.smokingCigarettePriceCents / 100).toFixed(2) : '',
  );

  return (
    <SettingsPage title={t('tracking.settings.title')} caption={t('tracking.settings.caption')} docs="Tracking.md">
      <SegmentedGroup>
        <SegmentedListSwitch
          label={t('tracking.water.title')}
          icon={'timer'}
          value={settings.trackWater}
          onValueChange={(value) => dispatch(setTrackWater(value))}
        />
        <SegmentedListSwitch
          label={t('tracking.food.title')}
          icon={'cake'}
          value={settings.trackFood}
          onValueChange={(value) => dispatch(setTrackFood(value))}
        />
        <SegmentedListSwitch
          label={t('tracking.smoking.title')}
          icon={'calendar'}
          supportingText={t('tracking.smoking.setting.subtitle')}
          value={settings.trackSmoking}
          onValueChange={(value) => {
            // Days before tracking began are not "smoke-free days", so the streak starts when this is first turned on.
            if (value && !settings.smokingTrackingSince) {
              dispatch(setSmokingTrackingSince(today.toString()));
            }
            dispatch(setTrackSmoking(value));
          }}
        />
      </SegmentedGroup>

      {settings.trackWater && (
        <FormRow>
          <IntegerEditor
            mode="outlined"
            label={t('tracking.water.goal.label', { unit: imperial ? 'oz' : 'ml' })}
            value={imperial ? Math.round(settings.waterGoalMl / mlPerOunce) : settings.waterGoalMl}
            onChange={(value) => dispatch(setWaterGoalMl(imperial ? Math.round(value * mlPerOunce) : value))}
          />
        </FormRow>
      )}

      {settings.trackFood && (
        <FormRow>
          <IntegerEditor
            mode="outlined"
            label={t('tracking.food.calorie_goal.label')}
            value={settings.calorieGoal}
            onChange={(value) => dispatch(setCalorieGoal(value))}
          />
          <IntegerEditor
            mode="outlined"
            label={t('tracking.food.protein_goal.label')}
            value={settings.proteinGoalGrams}
            onChange={(value) => dispatch(setProteinGoalGrams(value))}
          />
          <IntegerEditor
            mode="outlined"
            label={t('tracking.food.carbs_goal.label')}
            value={settings.carbsGoalGrams}
            onChange={(value) => dispatch(setCarbsGoalGrams(value))}
          />
          <IntegerEditor
            mode="outlined"
            label={t('tracking.food.fat_goal.label')}
            value={settings.fatGoalGrams}
            onChange={(value) => dispatch(setFatGoalGrams(value))}
          />
        </FormRow>
      )}

      {settings.trackSmoking && (
        <FormRow>
          <IntegerEditor
            mode="outlined"
            label={t('tracking.smoking.limit.label')}
            value={settings.smokingDailyLimit}
            onChange={(value) => dispatch(setSmokingDailyLimit(value))}
          />
          <TextInput
            mode="outlined"
            label={t('tracking.smoking.price.label')}
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
            onEndEditing={() => {
              const parsed = Number.parseFloat(price.replace(',', '.'));
              dispatch(
                setSmokingCigarettePriceCents(Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0),
              );
            }}
          />
        </FormRow>
      )}
    </SettingsPage>
  );
}
