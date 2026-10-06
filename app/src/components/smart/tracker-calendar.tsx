import { ActivityCalendar } from '@/components/presentation/calendar/activity-calendar';
import { ActivityLegend } from '@/components/presentation/calendar/activity-legend';
import IconButton from '@/components/presentation/foundation/icon-button';
import { SurfaceText } from '@/components/presentation/foundation/surface-text';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useToday } from '@/hooks/useToday';
import { TrackerKind } from '@/models/tracking';
import { useAppSelector, useAppSelectorWithArg } from '@/store';
import { selectTrackerMonth } from '@/store/tracking/derived';
import { LocalDate, Year, YearMonth } from '@js-joda/core';
import { useMemo, useState } from 'react';
import { I18nManager, View } from 'react-native';
import { Card } from 'react-native-paper';

/** A month of days graded by how each went for one tracker. Tapping a day selects it; tapping again clears. */
export function TrackerCalendar(props: {
  kind: TrackerKind;
  selectedDate: LocalDate;
  onDateSelect: (date: LocalDate) => void;
}) {
  const formatDate = useFormatDate();
  const today = useToday();
  const firstDayOfWeek = useAppSelector((x) => x.settings.firstDayOfWeek);
  const [yearMonth, setYearMonth] = useState(YearMonth.from(props.selectedDate));
  const params = useMemo(
    () => ({ kind: props.kind, yearMonth, today, firstDayOfWeek }),
    [props.kind, yearMonth, today, firstDayOfWeek],
  );
  const rows = useAppSelectorWithArg(selectTrackerMonth, params);

  const header = (
    <View style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <IconButton icon="chevronLeft" onPress={() => setYearMonth(yearMonth.minusMonths(1))} />
      </View>
      <View style={{ flex: 5, justifyContent: 'center', alignItems: 'center' }}>
        <SurfaceText>
          {formatDate(yearMonth.atDay(1), {
            month: 'long',
            year: yearMonth.year() === Year.now().value() ? undefined : 'numeric',
          })}
        </SurfaceText>
      </View>
      <View style={{ flex: 1 }}>
        <IconButton
          icon="chevronRight"
          onPress={() => setYearMonth(yearMonth.plusMonths(1))}
          disabled={yearMonth.equals(YearMonth.from(today))}
        />
      </View>
    </View>
  );

  return (
    <Card mode="contained">
      <Card.Content>
        <ActivityCalendar
          density="month"
          rows={rows}
          firstDayOfWeek={firstDayOfWeek}
          selectedDate={props.selectedDate}
          header={header}
          footer={<ActivityLegend showFriends={false} />}
          onCellPress={(cell) => !cell.isFuture && props.onDateSelect(cell.date)}
        />
      </Card.Content>
    </Card>
  );
}
