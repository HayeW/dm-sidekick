import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { clearActiveCombats } from '../data/combats';

// jsdom does not implement scrolling; tests can assert on this mock.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

afterEach(() => {
  cleanup();
  vi.mocked(window.scrollTo).mockClear();
  localStorage.clear();
  clearActiveCombats();
});
