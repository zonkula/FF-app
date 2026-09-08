// Display names only - the underlying data model still uses "player1"/"player2" (Firebase keys,
// Turn 1|2) everywhere, so existing data and schema are untouched by a name change here.
export const PLAYER_DISPLAY_NAMES = {
  player1: 'Zonk',
  player2: 'KBrakke',
} as const

export function displayNameForSlot(slot: 'player1' | 'player2'): string {
  return PLAYER_DISPLAY_NAMES[slot]
}

export function displayNameForTurn(turn: 1 | 2): string {
  return turn === 1 ? PLAYER_DISPLAY_NAMES.player1 : PLAYER_DISPLAY_NAMES.player2
}
