import { describe, expect, it } from 'vitest';
import type { PlayerCharacter } from './campaign';
import { addPlayer, removePlayer, renamePlayer, type PlayerChange } from './playerCharacters';

/** The list after a change that must succeed. */
function listOf(change: PlayerChange): PlayerCharacter[] {
  if ('error' in change) throw new Error(change.error);
  return change.players;
}

const errorOf = (change: PlayerChange) => ('error' in change ? change.error : undefined);

const party: PlayerCharacter[] = [
  { id: 'pc-1', name: 'Mira' },
  { id: 'pc-2', name: 'Tok' },
];

describe('DC-030 / DC-114 — Player Character toevoegen', () => {
  it('adds a player at the end, with the next free id', () => {
    expect(listOf(addPlayer(party, 'Wren'))).toEqual([...party, { id: 'pc-3', name: 'Wren' }]);
  });

  it('starts at pc-1 for an empty list', () => {
    expect(listOf(addPlayer([], 'Mira'))).toEqual([{ id: 'pc-1', name: 'Mira' }]);
  });

  it('ignores ids that are not numbered, like pc-alice', () => {
    const named = [{ id: 'pc-alice', name: 'Alice' }];

    expect(listOf(addPlayer(named, 'Mira')).at(-1)?.id).toBe('pc-1');
  });

  it('keeps ids unique after a player in the middle is removed', () => {
    const after = listOf(addPlayer(removePlayer(party, 'pc-1'), 'Wren'));

    expect(after.map((player) => player.id)).toEqual(['pc-2', 'pc-3']);
  });

  it('may reuse the number of the last player after it was removed: unique in the list', () => {
    expect(listOf(addPlayer(removePlayer(party, 'pc-2'), 'Wren')).at(-1)?.id).toBe('pc-2');
  });

  it('trims spaces around the name', () => {
    expect(listOf(addPlayer([], '  Mira  '))[0]!.name).toBe('Mira');
  });

  it('refuses an empty name', () => {
    expect(errorOf(addPlayer(party, '   '))).toBe('Enter a name.');
  });

  it('refuses a name that is already a player, whatever the case', () => {
    expect(errorOf(addPlayer(party, ' mira '))).toBe('“Mira” is already a player.');
  });

  it('does not change the list it was given', () => {
    const before = structuredClone(party);
    addPlayer(party, 'Wren');

    expect(party).toEqual(before);
  });
});

describe('DC-114 — Player Character hernoemen', () => {
  it('renames a player, keeping its id and place', () => {
    expect(listOf(renamePlayer(party, 'pc-1', 'Mirabel'))).toEqual([
      { id: 'pc-1', name: 'Mirabel' },
      { id: 'pc-2', name: 'Tok' },
    ]);
  });

  it('allows a change of case in the player’s own name', () => {
    expect(listOf(renamePlayer(party, 'pc-2', 'TOK'))[1]!.name).toBe('TOK');
  });

  it('refuses an empty name or another player’s name', () => {
    expect(errorOf(renamePlayer(party, 'pc-1', ''))).toBe('Enter a name.');
    expect(errorOf(renamePlayer(party, 'pc-1', 'tok'))).toBe('“Tok” is already a player.');
  });

  it('trims spaces around the new name', () => {
    expect(listOf(renamePlayer(party, 'pc-1', ' Mirabel '))[0]!.name).toBe('Mirabel');
  });

  it('changes nothing for an unknown id, whatever the name', () => {
    expect(listOf(renamePlayer(party, 'pc-9', 'Wren'))).toEqual(party);
    expect(listOf(renamePlayer(party, 'pc-9', 'Tok'))).toEqual(party);
  });
});

describe('DC-114 — Player Character verwijderen', () => {
  it('removes a player and keeps the order of the others', () => {
    const three = listOf(addPlayer(party, 'Wren'));

    expect(removePlayer(three, 'pc-2').map((player) => player.name)).toEqual(['Mira', 'Wren']);
  });

  it('changes nothing for an unknown id', () => {
    expect(removePlayer(party, 'pc-9')).toEqual(party);
  });
});
