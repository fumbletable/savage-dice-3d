import OBR from "@owlbear-rodeo/sdk";
import type { Player } from "@owlbear-rodeo/sdk";
import { useEffect, useState } from "react";
import {
  ROLL_KEY,
  ROLL_THROWS_KEY,
  ROLL_CHAINS_KEY,
  ROLL_DONE_KEY,
  ROLL_TRANSFORMS_KEY,
} from "./obr";
import type {
  SavageRoll,
  RollThrows,
  RollChains,
  RollDone,
  RollTransforms,
} from "./types";

export interface RemoteRoll {
  player: Pick<Player, "id" | "name" | "color">;
  roll: SavageRoll;
  throws: RollThrows;
  chains: RollChains;
  done: RollDone;
  transforms: RollTransforms;
  finishedRolling: boolean;
}

/** Extract a complete roll from a player's metadata, or null if they have no active roll. */
function hydrateRoll(player: Player): RemoteRoll | null {
  const roll = player.metadata[ROLL_KEY] as SavageRoll | undefined;
  if (!roll) return null;

  const throws = (player.metadata[ROLL_THROWS_KEY] as RollThrows | undefined) ?? {};
  const chains = (player.metadata[ROLL_CHAINS_KEY] as RollChains | undefined) ?? {};
  const done = (player.metadata[ROLL_DONE_KEY] as RollDone | undefined) ?? {};
  const transforms = (player.metadata[ROLL_TRANSFORMS_KEY] as RollTransforms | undefined) ?? {};

  const doneValues = Object.values(done);
  const finishedRolling =
    doneValues.length > 0 && doneValues.every((v) => v === true);

  return {
    player: { id: player.id, name: player.name, color: player.color },
    roll,
    throws,
    chains,
    done,
    transforms,
    finishedRolling,
  };
}

/**
 * Watch every OTHER player's active roll.
 * Self is filtered out — local roll is rendered from DiceApp's own state.
 * Returns [] outside OBR (local dev).
 */
export function useRemoteRolls(selfId: string | null | undefined): RemoteRoll[] {
  const [rolls, setRolls] = useState<RemoteRoll[]>([]);

  useEffect(() => {
    if (!OBR.isAvailable) return;
    let mounted = true;
    let unsub: (() => void) | undefined;

    const refresh = (players: Player[]) => {
      if (!mounted) return;
      const next: RemoteRoll[] = [];
      for (const p of players) {
        if (p.id === selfId) continue;
        const r = hydrateRoll(p);
        if (r) next.push(r);
      }
      setRolls(next);
    };

    const setup = async () => {
      // onChange before ready throws "Unable to send message: not ready".
      // Wait for ready, then fetch + subscribe.
      if (!OBR.isReady) {
        await new Promise<void>((resolve) => OBR.onReady(() => resolve()));
      }
      if (!mounted) return;
      const players = await OBR.party.getPlayers();
      refresh(players);
      unsub = OBR.party.onChange(refresh);
    };
    setup();

    return () => {
      mounted = false;
      unsub?.();
    };
  }, [selfId]);

  return rolls;
}
