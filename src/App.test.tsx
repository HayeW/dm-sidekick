import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App (smoke test)', () => {
  it('renders the app title', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'DM Cockpit' })).toBeInTheDocument();
  });
});
