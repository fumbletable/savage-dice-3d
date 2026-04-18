import { useRef, useCallback, useEffect } from "react";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getValueFromDiceGroup } from "../lib/diceValue";
import { DiceMesh } from "../meshes/DiceMesh";
import { DiceCollider } from "../meshes/DiceColliders";
import { DiceMaterial } from "../materials/DiceMaterial";
import type { DieType } from "../meshes/DiceMesh";
import type { DiceStyle } from "../materials/DiceMaterial";
import type { DiceThrow, DiceTransform } from "../lib/types";

// d4 needs extra patience — tetrahedra balance on edges before settling
const SETTLE_SPEED: Record<DieType, number> = {
  d4:  0.008,
  d6:  0.005,
  d8:  0.005,
  d10: 0.005,
  d12: 0.005,
};

// How long (ms) the die must be below settle speed before we read the value.
// d4 gets extra time to stop wobbling.
const SETTLE_HOLD: Record<DieType, number> = {
  d4:  400,
  d6:  150,
  d8:  150,
  d10: 200,
  d12: 200,
};

const MAX_ROLL_TIME = 6000;

// d4 is high-friction, low-bounce so it grips and stops rather than spinning
const FRICTION: Record<DieType, number>    = { d4: 0.8, d6: 0.3, d8: 0.3, d10: 0.3, d12: 0.3 };
const RESTITUTION: Record<DieType, number> = { d4: 0.05, d6: 0.2, d8: 0.2, d10: 0.2, d12: 0.2 };

interface Props {
  dieType: DieType;
  dieThrow: DiceThrow;
  style: DiceStyle;
  tint?: string;
  /** Fires when the die settles. Transform is its final pose — goes to metadata. */
  onResult: (value: number, transform: DiceTransform) => void;
}

function magnitude(v: { x: number; y: number; z: number }) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function PhysicsDie({ dieType, dieThrow, style, tint, onResult }: Props) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<THREE.Group>(null);
  const settledRef = useRef(false);
  const resultSentRef = useRef(false);
  const slowSinceRef = useRef<number | null>(null);
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last-applied throw serialised — stops redundant re-fires when a new
  // dieThrow OBJECT arrives with identical values (e.g. when a remote roll's
  // metadata updates after settle and useRemoteRolls produces fresh refs).
  const lastThrowKeyRef = useRef<string>("");

  // Stash the latest onResult in a ref so `settle` never changes identity.
  // Parents often pass fresh arrow functions each render; without this, the
  // throw-applying useEffect would refire every frame and teleport the die
  // back to its spawn point mid-roll.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  const settle = useCallback(() => {
    const rb = rigidBodyRef.current;
    const group = groupRef.current;
    if (!rb || !group || resultSentRef.current) return;
    rb.setEnabledRotations(false, false, false, false);
    rb.setEnabledTranslations(false, false, false, false);
    rb.setAngvel({ x: 0, y: 0, z: 0 }, false);
    rb.setLinvel({ x: 0, y: 0, z: 0 }, false);
    settledRef.current = true;
    resultSentRef.current = true;
    const value = getValueFromDiceGroup(group);
    const p = rb.translation();
    const r = rb.rotation();
    const transform: DiceTransform = {
      position: { x: p.x, y: p.y, z: p.z },
      rotation: { x: r.x, y: r.y, z: r.z, w: r.w },
    };
    onResultRef.current(value, transform);
  }, []);

  // Apply throw on mount AND whenever dieThrow changes (ace re-throws).
  // This re-fires the same rigid body imperatively rather than remounting it —
  // avoids the cost of destroying/rebuilding the Rapier body and collider.
  useEffect(() => {
    const rb = rigidBodyRef.current;
    if (!rb) return;

    // Remote rolls re-publish metadata after each die settles, producing a
    // fresh dieThrow object with the SAME values. Without this guard the
    // receiver's dice teleport back to spawn and re-roll 2-3 times per roll.
    const throwKey = JSON.stringify(dieThrow);
    if (throwKey === lastThrowKeyRef.current) return;
    lastThrowKeyRef.current = throwKey;

    // Re-enable motion (settle locked it if we just finished a previous throw)
    rb.setEnabledRotations(true, true, true, true);
    rb.setEnabledTranslations(true, true, true, true);

    // Reposition & reorient (quaternion passes through directly — no Euler detour)
    rb.setTranslation(dieThrow.position, true);
    rb.setRotation(dieThrow.rotation, true);

    // Kick
    rb.setLinvel(dieThrow.linearVelocity, true);
    rb.setAngvel(dieThrow.angularVelocity, true);

    // Reset settle state so the next landing reports a fresh value
    settledRef.current = false;
    resultSentRef.current = false;
    slowSinceRef.current = null;

    // Reset the max-roll-time safety timeout for this throw
    if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
    maxTimeoutRef.current = setTimeout(() => {
      if (!settledRef.current) settle();
    }, MAX_ROLL_TIME);

    return () => {
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
    };
  }, [dieThrow, settle]); // settle is now stable (empty deps); only dieThrow drives re-fire

  useFrame(() => {
    const rb = rigidBodyRef.current;
    if (!rb || settledRef.current) return;
    const speed = magnitude(rb.linvel()) + magnitude(rb.angvel());
    const low = speed < SETTLE_SPEED[dieType] && rb.translation().y < 1.5;
    if (low) {
      if (slowSinceRef.current === null) {
        slowSinceRef.current = performance.now();
      } else if (performance.now() - slowSinceRef.current > SETTLE_HOLD[dieType]) {
        settle();
      }
    } else {
      slowSinceRef.current = null;
    }
  });

  // Initial RigidBody placement — useEffect overrides this on mount, but R3F
  // wants *something* for first render. Position in the right spot; leave
  // rotation at default since physics is paused for one RAF (DiceScene) and
  // useEffect applies the authoritative quaternion before the sim steps.
  const initialPos: [number, number, number] = [
    dieThrow.position.x,
    dieThrow.position.y,
    dieThrow.position.z,
  ];

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={initialPos}
      gravityScale={2}
      friction={FRICTION[dieType]}
      restitution={RESTITUTION[dieType]}
      colliders={false}
    >
      <DiceCollider dieType={dieType} />
      <DiceMesh ref={groupRef} dieType={dieType}>
        <DiceMaterial style={style} tint={tint} />
      </DiceMesh>
    </RigidBody>
  );
}
