import { describe, it, expect } from 'vitest';
import en from '@/i18n/en.json';
import { nudgeMessages } from '@/models/gym-reminder-messages';

describe('nudgeMessages', () => {
  it('has English text for every title and body', () => {
    const strings = en as Record<string, string>;
    for (const keys of nudgeMessages) {
      for (const key of keys) {
        expect(strings[key], key).toBeTruthy();
      }
    }
  });
});
