import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalMessageStorage } from './localMessageStorage';

describe('LocalMessageStorage', () => {
  beforeEach(() => {
    LocalMessageStorage.clearHistory();
  });

  it('keeps prompt history in memory without using localStorage', () => {
    const getItem = vi.spyOn(window.localStorage, 'getItem');
    const setItem = vi.spyOn(window.localStorage, 'setItem');

    LocalMessageStorage.addMessage('first');
    LocalMessageStorage.addMessage('second');

    expect(LocalMessageStorage.getRecentMessages()).toEqual(['second', 'first']);
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('drops duplicates and clears the in-memory history', () => {
    LocalMessageStorage.addMessage('same');
    LocalMessageStorage.addMessage('same');
    expect(LocalMessageStorage.getRecentMessages()).toEqual(['same']);

    LocalMessageStorage.clearHistory();
    expect(LocalMessageStorage.getRecentMessages()).toEqual([]);
  });
});
