// Broadcast-compatible physics primitives.
// Shapes match owlbear-rodeo/dice exactly so we can diff against their source
// if we ever need to borrow more of their networking code.
// See /tmp/obr-dice/src/types/ for the original definitions.

export interface DiceVector3 {
  x: number;
  y: number;
  z: number;
}

export interface DiceQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Initial physics conditions for a die — the "entropy" that determines the tumble. */
export interface DiceThrow {
  position: DiceVector3;
  rotation: DiceQuaternion;
  linearVelocity: DiceVector3;
  angularVelocity: DiceVector3;
}

/** Final resting pose once a die has settled. Used for physics-skip replay. */
export interface DiceTransform {
  position: DiceVector3;
  rotation: DiceQuaternion;
}

// --- SWADE-specific broadcast schema ---
// This is OUR schema, not OBR's. OBR's Dice type is recursive (advantage groups
// etc.) which doesn't fit SWADE's trait + wild + damage model cleanly.

import type { DieType } from "../meshes/DiceMesh";
import type { DiceStyle } from "../materials/DiceMaterial";

export type DieRole = "trait" | "wild" | "damage";

export interface SavageDie {
  id: string;          // "trait" | "wild" | "dmg-0" | ...
  type: DieType;
  role: DieRole;
  style: DiceStyle;
}

/** Static description of a roll — what dice, what mode. Doesn't change mid-roll. */
export interface SavageRoll {
  rollId: string;      // unique per fresh roll; receivers use to detect a new roll
  playerId: string;    // OBR.player.id of the roller
  playerName: string;
  playerColor: string;
  mode: "trait" | "damage";
  modifier: number;
  wildCard: boolean;   // trait mode only
  hidden?: boolean;    // GM private rolls — receivers see "a roll happened" but no dice
  dice: SavageDie[];
  timestamp: number;   // ms epoch, for recent-rolls log ordering
}

// Per-die dynamic state, broadcast as separate metadata keys (so single-die
// updates don't rewrite the whole roll).

/** CURRENT throw per die. Re-assigned on ace — PhysicsDie re-fires imperatively. */
export type RollThrows = Record<string, DiceThrow>;

/** Chain of face values per die. Appended each time a die settles. */
export type RollChains = Record<string, number[]>;

/** Per-die done flag. False while acing, true once the chain ends on a non-max face. */
export type RollDone = Record<string, boolean>;

/** Final pose per die. Last-in-chain pose; used for physics-skip replay. */
export type RollTransforms = Record<string, DiceTransform>;
