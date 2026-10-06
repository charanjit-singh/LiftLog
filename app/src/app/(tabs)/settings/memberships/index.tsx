import { SettingsPage } from '@/components/layout/settings-page';
import { PageActions } from '@/components/presentation/foundation/page-actions';
import { SegmentedGroup } from '@/components/presentation/foundation/segmented-list';
import { SegmentedListLink } from '@/components/presentation/foundation/segmented-list-link';
import { GymMembership, membershipDaysRemaining, membershipStatus, sortMemberships } from '@/models/membership';
import { useAppSelector } from '@/store';
import { putMembership, selectMemberships } from '@/store/memberships';
import { uuid } from '@/utils/uuid';
import AddIcon from '@expo/material-symbols/add.xml';
import { LocalDate } from '@js-joda/core';
import { useTranslate } from '@tolgee/react';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';

export default function MembershipsPage() {
  const { t } = useTranslate();
  const { push } = useRouter();
  const dispatch = useDispatch();
  const memberships = sortMemberships(useAppSelector(selectMemberships));
  const today = LocalDate.now();

  // The editor edits a membership rather than filling in a form, so one exists before it opens. An
  // editor left with no name removes what it was given.
  const addMembership = () => {
    const id = uuid();
    dispatch(putMembership({ id, name: '', startDate: today.toString(), endDate: undefined, notes: '' }));
    push(`/settings/memberships/${id}`);
  };

  const describe = (membership: GymMembership) => {
    const range = membership.endDate
      ? t('memberships.range.label', { start: membership.startDate, end: membership.endDate })
      : t('memberships.range_ongoing.label', { start: membership.startDate });
    const status = membershipStatus(membership, today);
    const remaining = membershipDaysRemaining(membership, today);
    const statusText =
      status === 'active' && remaining !== undefined
        ? t('memberships.days_remaining.label', { count: remaining })
        : t(`memberships.status.${status}.label`);
    return `${range} - ${statusText}`;
  };

  return (
    <SettingsPage
      title={t('memberships.title')}
      caption={t('memberships.explanation')}
      actions={
        <PageActions
          primary={{
            label: t('memberships.add.button'),
            onPress: addMembership,
            icon: AddIcon,
            systemImage: 'plus',
          }}
        />
      }
    >
      <SegmentedGroup>
        {memberships.map((membership) => (
          <SegmentedListLink
            key={membership.id}
            label={membership.name || t('memberships.unnamed.label')}
            supportingText={describe(membership)}
            icon={'calendar'}
            onPress={() => push(`/settings/memberships/${membership.id}`)}
          />
        ))}
      </SegmentedGroup>
    </SettingsPage>
  );
}
