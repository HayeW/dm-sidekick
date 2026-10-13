import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { clearActiveCombats } from '../data/combats';

// jsdom does not implement scrolling; tests can assert on this mock.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

// jsdom has no pointer events; enough of them for the drag tests (clientY, pointerId, button).
if (!('PointerEvent' in window)) {
  class PointerEvent extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  Object.assign(window, { PointerEvent });
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
}

afterEach(() => {
  cleanup();
  vi.mocked(window.scrollTo).mockClear();
  localStorage.clear();
  clearActiveCombats();
});
