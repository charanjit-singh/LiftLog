import { SettingsPage } from '@/components/layout/settings-page';
import ConfirmationDialog from '@/components/presentation/foundation/confirmation-dialog';
import { FormRow } from '@/components/presentation/foundation/form-row';
import { PageActions } from '@/components/presentation/foundation/page-actions';
import { GymMembership, membershipDatesAreValid } from '@/models/membership';
import { useAppSelector } from '@/store';
import { putMembership, removeMembership } from '@/store/memberships';
import DeleteIcon from '@expo/material-symbols/delete.xml';
import { LocalDate } from '@js-joda/core';
import { T, useTranslate } from '@tolgee/react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { HelperText, TextInput } from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';
import { useDispatch } from 'react-redux';

const toJsDate = (date: string) => {
  const parsed = LocalDate.parse(date);
  return new Date(parsed.year(), parsed.monthValue() - 1, parsed.dayOfMonth());
};
const fromJsDate = (date: Date) => LocalDate.of(date.getFullYear(), date.getMonth() + 1, date.getDate()).toString();

export default function MembershipEditorPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const membership = useAppSelector((s) => s.memberships.memberships.find((x) => x.id === id));
  if (!membership) {
    return <Redirect href={'/settings/memberships'} />;
  }
  return <MembershipEditor membership={membership} />;
}

function MembershipEditor({ membership }: { membership: GymMembership }) {
  const { t } = useTranslate();
  const dispatch = useDispatch();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const update = (changes: Partial<GymMembership>) => dispatch(putMembership({ ...membership, ...changes }));

  const nameError = membership.name.trim() ? '' : t('memberships.name.required.message');
  const datesError = membershipDatesAreValid(membership) ? '' : t('memberships.dates.invalid.message');

  // Adding a membership creates it, so one that was opened and never named was never really added.
  const latest = useRef(membership);
  useEffect(() => {
    latest.current = membership;
  }, [membership]);
  useEffect(
    () => () => {
      if (!latest.current.name.trim()) {
        dispatch(removeMembership(latest.current.id));
      }
    },
    [dispatch],
  );

  return (
    <SettingsPage
      title={membership.name || t('memberships.add.button')}
      actions={
        <PageActions
          primary={{
            label: t('generic.delete.button'),
            onPress: () => setDeleteOpen(true),
            icon: DeleteIcon,
            systemImage: 'trash',
          }}
        />
      }
    >
      <FormRow noGap>
        <TextInput
          mode="outlined"
          label={t('memberships.name.label')}
          value={membership.name}
          error={!!nameError}
          onChangeText={(name) => update({ name })}
          onBlur={() => update({ name: membership.name.trim() })}
        />
        <HelperText type="error">{nameError}</HelperText>
        <DatePickerInput
          locale="default"
          inputMode="start"
          label={t('memberships.start_date.label')}
          value={toJsDate(membership.startDate)}
          onChange={(date) => {
            if (date) update({ startDate: fromJsDate(date) });
          }}
        />
        <DatePickerInput
          locale="default"
          inputMode="start"
          label={t('memberships.end_date.label')}
          value={membership.endDate ? toJsDate(membership.endDate) : undefined}
          onChange={(date) => update({ endDate: date ? fromJsDate(date) : undefined })}
        />
        <HelperText type={datesError ? 'error' : 'info'}>{datesError || t('memberships.end_date.hint')}</HelperText>
        <TextInput
          mode="outlined"
          label={t('memberships.notes.label')}
          value={membership.notes}
          onChangeText={(notes) => update({ notes })}
          multiline
        />
      </FormRow>

      <ConfirmationDialog
        open={deleteOpen}
        headline={t('memberships.delete.title')}
        textContent={<T keyName="memberships.delete.message" />}
        onCancel={() => setDeleteOpen(false)}
        onOk={() => {
          dispatch(removeMembership(membership.id));
          router.back();
        }}
      />
    </SettingsPage>
  );
}
