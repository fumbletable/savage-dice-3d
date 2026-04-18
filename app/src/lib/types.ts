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
