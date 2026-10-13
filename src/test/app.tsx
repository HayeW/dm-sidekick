// Shared helpers for the screen tests: they render the whole app at a URL, so routing,
// storage and the screens are tested together.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from '../App';
import BrowserBack from './BrowserBack';

export function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

export function renderWithBrowserBack(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <BrowserBack />
    </MemoryRouter>,
  );
}

/**
 * A user-event instance without its default pause between actions: the tests don't need
 * real timing, and skipping it makes typing and clicking much faster.
 */
export const setupUser = () => userEvent.setup({ delay: null });

export const pressBrowserBack = () =>
  setupUser().click(screen.getByRole('button', { name: 'Browser back' }));

/** Moves a combatant one place with the arrow keys on its drag handle (reorder mode, D21). */
export async function moveByKey(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  direction: 'up' | 'down',
) {
  screen.getByRole('button', { name: `Move ${name}` }).focus();
  await user.keyboard(direction === 'up' ? '{ArrowUp}' : '{ArrowDown}');
}

/** A combat row's name: its first innermost text (name comes before HP / PC / DEAD). */
export function combatantName(row: HTMLElement) {
  return Array.from(row.querySelectorAll('span')).find((span) => span.children.length === 0)
    ?.textContent;
}

/** Every combat row as "name · HP / PC / DEAD", in combat order: the visible combat state. */
export const combatOrder = () =>
  within(screen.getByRole('list', { name: 'Combat order' }))
    .getAllByRole('listitem')
    .map((row) =>
      // The row's innermost texts, without the buttons.
      Array.from(row.querySelectorAll('span'))
        .filter((span) => span.children.length === 0)
        .map((span) => span.textContent)
        .join(' · '),
    );
