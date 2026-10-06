import IconButton from '@/components/presentation/foundation/icon-button';
import { SurfaceText } from '@/components/presentation/foundation/surface-text';
import { spacing, useAppTheme } from '@/hooks/useAppTheme';
import { View } from 'react-native';

/** One logged item in a day's list, with a delete button. */
export function EntryRow(props: { label: string; detail?: string; trailing?: string; onDelete: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[2],
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
      }}
    >
      <View style={{ flex: 1, paddingVertical: spacing[2] }}>
        <SurfaceText numberOfLines={1}>{props.label}</SurfaceText>
        {props.detail ? (
          <SurfaceText font="text-xs" color="onSurfaceVariant">
            {props.detail}
          </SurfaceText>
        ) : null}
      </View>
      {props.trailing ? <SurfaceText weight="bold">{props.trailing}</SurfaceText> : null}
      <IconButton icon="delete" size={20} onPress={props.onDelete} />
    </View>
  );
}

export function formatLoggedTime(loggedAt: string): string {
  return new Date(loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
