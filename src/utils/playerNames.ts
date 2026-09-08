// Display names only - the underlying data model still uses "player1"/"player2" (Firebase keys,
// Turn 1|2) everywhere, so existing data and schema are untouched by a name change here.
export const PLAYER_DISPLAY_NAMES = {
  player1: 'Zonk',
  player2: 'KBrakke',
} as const

export type PlayerName = (typeof PLAYER_DISPLAY_NAMES)[keyof typeof PLAYER_DISPLAY_NAMES]

export function displayNameForSlot(slot: 'player1' | 'player2'): PlayerName {
  return PLAYER_DISPLAY_NAMES[slot]
}

export function displayNameForTurn(turn: 1 | 2): PlayerName {
  return turn === 1 ? PLAYER_DISPLAY_NAMES.player1 : PLAYER_DISPLAY_NAMES.player2
}

export function turnForPlayerName(name: PlayerName): 1 | 2 {
  return name === PLAYER_DISPLAY_NAMES.player1 ? 1 : 2
}

export function slotForPlayerName(name: PlayerName): 'player1' | 'player2' {
  return name === PLAYER_DISPLAY_NAMES.player1 ? 'player1' : 'player2'
}
