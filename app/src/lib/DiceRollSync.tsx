import OBR from "@owlbear-rodeo/sdk";
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

interface Props {
  roll: SavageRoll | null;
  throws: RollThrows;
  chains: RollChains;
  done: RollDone;
  transforms: RollTransforms;
}

/**
 * Writes the current roll state into OBR player metadata so other clients can
 * render the same tumble. Five metadata keys, atomic per key:
 *
 *   roll             — static: what dice, who rolled, mode/modifier/wildCard
 *   rollThrows       — current initial-conditions per die (re-fires on ace)
 *   rollChains       — face values per die, appended per settle (ace chains)
 *   rollDone         — per-die flag, true when the chain ends on a non-max face
 *   rollTransforms   — final resting pose per die (for physics-skip replay)
 *
 * Hidden rolls publish `roll` only; throws/chains/done/transforms are cleared
 * so receivers know a roll happened but can't see the dice or result.
 */
export function DiceRollSync({ roll, throws, chains, done, transforms }: Props) {
  const [ready, setReady] = useState(OBR.isReady);

  useEffect(() => {
    if (!OBR.isAvailable) return; // local dev outside OBR — skip all networking
    if (OBR.isReady) {
      setReady(true);
    } else {
      OBR.onReady(() => setReady(true));
    }
  }, []);

  useEffect(() => {
    if (!ready || !OBR.isAvailable) return;

    const hide = roll?.hidden === true;
    const nothing = !roll;

    OBR.player.setMetadata({
      [ROLL_KEY]: roll ?? undefined,
      [ROLL_THROWS_KEY]: nothing || hide ? undefined : throws,
      [ROLL_CHAINS_KEY]: nothing || hide ? undefined : chains,
      [ROLL_DONE_KEY]: nothing || hide ? undefined : done,
      [ROLL_TRANSFORMS_KEY]: nothing || hide ? undefined : transforms,
    });
  }, [ready, roll, throws, chains, done, transforms]);

  return null;
}
