import OBR from "@owlbear-rodeo/sdk";
import type { Player } from "@owlbear-rodeo/sdk";
import { ROLL_KEY } from "./lib/obr";

/**
 * Background script — auto-opens our popover when any other player starts a
 * new roll, so the dice tumble is visible in real time instead of hidden until
 * the user clicks the extension icon.
 *
 * Detection uses `rollId` change, not just "metadata updated" — each ace step
 * re-publishes metadata but re-uses the same rollId, so we open once per
 * fresh roll rather than every time the roller's dice settle.
 *
 * Stale rolls left in metadata from a previous session are captured on first
 * load so we don't auto-open on reconnect.
 */

interface RollMetaShape {
  rollId?: string;
}

OBR.onReady(async () => {
  const seen = new Map<string, string>(); // playerId → lastSeenRollId

  // Capture current state so we only react to FUTURE roll changes.
  const initial = await OBR.party.getPlayers();
  for (const p of initial) {
    const roll = p.metadata[ROLL_KEY] as RollMetaShape | undefined;
    if (roll?.rollId) seen.set(p.id, roll.rollId);
  }

  OBR.party.onChange(async (players: Player[]) => {
    let newRoll = false;
    for (const p of players) {
      const roll = p.metadata[ROLL_KEY] as RollMetaShape | undefined;
      const last = seen.get(p.id);
      if (roll?.rollId && roll.rollId !== last) {
        seen.set(p.id, roll.rollId);
        newRoll = true;
      }
    }
    if (newRoll) {
      const isOpen = await OBR.action.isOpen();
      if (!isOpen) {
        await OBR.action.open();
      }
    }
  });
});
