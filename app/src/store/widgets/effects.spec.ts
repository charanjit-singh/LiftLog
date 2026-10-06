import { describe, it, expect, vi } from 'vitest';
import { setTrackWater } from '@/store/settings';
import { putWaterEntry } from '@/store/tracking';
import { applyWidgetEffects } from '@/store/widgets/effects';
import { createAddEffectTestBed } from '@/utils/__test__/add-effect-testbed';

function setup(hydrated: { settings: boolean; tracking: boolean }) {
  const widgetService = { start: vi.fn(), refresh: vi.fn().mockResolvedValue(undefined) };
  const testBed = createAddEffectTestBed({
    initialState: {
      settings: { isHydrated: hydrated.settings },
      tracking: { isHydrated: hydrated.tracking },
    },
    services: { widgetService },
  });
  applyWidgetEffects(testBed.addEffect);
  return { testBed, widgetService };
}

const entry = { id: 'w1', date: '2026-10-10', ml: 250, loggedAt: 'x' };

describe('widget effects', () => {
  it('refreshes the widgets and starts listening once everything has loaded', async () => {
    const { testBed, widgetService } = setup({ settings: true, tracking: true });

    await testBed.dispatchHandled(putWaterEntry(entry));

    expect(widgetService.start).toHaveBeenCalledTimes(1);
    expect(widgetService.refresh).toHaveBeenCalledTimes(1);
  });

  it('also refreshes when a tracker is switched on or off', async () => {
    const { testBed, widgetService } = setup({ settings: true, tracking: true });

    await testBed.dispatchHandled(setTrackWater(false));

    expect(widgetService.refresh).toHaveBeenCalledTimes(1);
  });

  it('waits for data to load, so the widget never shows an empty day that is not real', async () => {
    const { testBed, widgetService } = setup({ settings: true, tracking: false });

    await testBed.dispatchHandled(putWaterEntry(entry));

    expect(widgetService.refresh).not.toHaveBeenCalled();
    expect(widgetService.start).not.toHaveBeenCalled();
  });
});
