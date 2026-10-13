import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { Campaign, ContentBlock } from '../../domain/campaign';
import SceneTile from './SceneTile';

const campaign: Campaign = {
  id: 'c-1',
  name: 'Test campaign',
  scenes: [],
  playerCharacters: [],
  encounters: [],
  npcs: [{ id: 'npc-marta', name: 'Marta', description: 'Innkeeper' }],
  locations: [{ id: 'loc-inn', name: 'The Inn', description: 'Smoky and warm' }],
  notes: [],
};

const renderTile = (block: ContentBlock) =>
  render(
    <MemoryRouter>
      <SceneTile block={block} campaign={campaign} />
    </MemoryRouter>,
  );

describe('DC-010 — Scene tonen: tiles met campaign-level NPCs en locations (D25)', () => {
  it('shows the name and description of the location the tile refers to', () => {
    renderTile({ id: 'b-1', type: 'location', locationId: 'loc-inn' });

    expect(screen.getByText('The Inn')).toBeInTheDocument();
    expect(screen.getByText('Smoky and warm')).toBeInTheDocument();
  });

  it('shows "Location not found" when the location does not exist', () => {
    renderTile({ id: 'b-1', type: 'location', locationId: 'loc-gone' });

    expect(screen.getByText('Location not found')).toBeInTheDocument();
  });

  it('shows the names of the NPCs the tile refers to, skipping unknown ones', () => {
    renderTile({ id: 'b-1', type: 'npcs', npcIds: ['npc-gone', 'npc-marta'] });

    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Marta']);
  });

  it('links every NPC name to that NPC (DC-013)', () => {
    renderTile({ id: 'b-1', type: 'npcs', npcIds: ['npc-marta'] });

    expect(screen.getByRole('link', { name: 'Marta' })).toHaveAttribute(
      'href',
      '/c/c-1/npcs/npc-marta',
    );
  });

  it('shows "No NPCs" when none of the NPCs exist', () => {
    renderTile({ id: 'b-1', type: 'npcs', npcIds: ['npc-gone'] });

    expect(screen.getByText('No NPCs')).toBeInTheDocument();
  });
});
