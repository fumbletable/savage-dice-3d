import { useRef, useCallback, useEffect } from "react";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getValueFromDiceGroup } from "../lib/diceValue";
import { DiceMesh } from "../meshes/DiceMesh";
import { DiceCollider } from "../meshes/DiceColliders";
import type { DieType } from "../meshes/DiceMesh";

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

export interface DieThrow {
  position: [number, number, number];
  rotation: [number, number, number];
  linearVelocity: [number, number, number];
  angularVelocity: [number, number, number];
}

interface Props {
  dieType: DieType;
  dieThrow: DieThrow;
  color?: string;
  onResult: (value: number) => void;
}

function magnitude(v: { x: number; y: number; z: number }) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function PhysicsDie({ dieType, dieThrow, color = "#d4af37", onResult }: Props) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<THREE.Group>(null);
  const settledRef = useRef(false);
  const resultSentRef = useRef(false);
  const slowSinceRef = useRef<number | null>(null);

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
    onResult(getValueFromDiceGroup(group));
  }, [onResult]);

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

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!settledRef.current) settle();
    }, MAX_ROLL_TIME);
    return () => clearTimeout(timeout);
  }, [settle]);

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={dieThrow.position}
      rotation={dieThrow.rotation}
      linearVelocity={dieThrow.linearVelocity}
      angularVelocity={dieThrow.angularVelocity}
      gravityScale={2}
      friction={FRICTION[dieType]}
      restitution={RESTITUTION[dieType]}
      colliders={false}
    >
      <DiceCollider dieType={dieType} />
      <DiceMesh ref={groupRef} dieType={dieType}>
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.1} />
      </DiceMesh>
    </RigidBody>
  );
}
