import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { PhysicsDie } from "./PhysicsDie";
import type { DieThrow } from "./PhysicsDie";
import type { DieType } from "../meshes/DiceMesh";
import type { DiceStyle } from "../materials/DiceMaterial";

export interface SceneDie {
  id: string;
  dieType: DieType;
  throw: DieThrow;
  style: DiceStyle;
  tint?: string;
}

interface Props {
  dice: SceneDie[];
  onResult: (id: string, value: number) => void;
}

const W = 2.0; // half-width (X)
const D = 3.2; // half-depth (Z)
const T = 0.5; // wall thickness (enough to catch fast dice)
const H = 5;   // wall half-height

// Pause physics for one RAF after a new roll starts so every RigidBody is
// instantiated before the sim advances a step. Without this, the order dice
// mount leaks into the simulation and clients diverge by a frame.
// Keyed on the concatenated die ids — new set of dice = fresh pause cycle.
function useRollPause(dice: SceneDie[]) {
  const [paused, setPaused] = useState(true);
  const key = dice.map((d) => d.id).join("|");
  useEffect(() => {
    setPaused(true);
    const raf = requestAnimationFrame(() => setPaused(false));
    return () => cancelAnimationFrame(raf);
  }, [key]);
  return paused;
}

export function DiceScene({ dice, onResult }: Props) {
  const paused = useRollPause(dice);
  return (
    <Canvas
      camera={{ position: [0, 9, 1.5], fov: 38 }}
      shadows
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#1e1e38"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 4, 4]} intensity={1.8} castShadow />
      <directionalLight position={[-4, 3, -2]} intensity={0.9} color="#ffd8b0" />
      <directionalLight position={[0, 6, -4]} intensity={0.5} color="#b8c8ff" />

      <Physics
        gravity={[0, -20, 0]}
        interpolate={false}
        timeStep={1 / 120}
        updateLoop="independent"
        paused={paused}
      >
        {/* Floor */}
        <RigidBody type="fixed" friction={0.7} restitution={0.1}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[W * 2, D * 2]} />
            <meshStandardMaterial color="#1e1e38" roughness={0.95} />
          </mesh>
        </RigidBody>

        {/* Invisible solid walls — CuboidCollider has real thickness, no tunneling */}
        <RigidBody type="fixed">
          <CuboidCollider args={[T, H, D + T]} position={[-(W + T), H, 0]} />
        </RigidBody>
        <RigidBody type="fixed">
          <CuboidCollider args={[T, H, D + T]} position={[W + T, H, 0]} />
        </RigidBody>
        <RigidBody type="fixed">
          <CuboidCollider args={[W + T, H, T]} position={[0, H, -(D + T)]} />
        </RigidBody>
        <RigidBody type="fixed">
          <CuboidCollider args={[W + T, H, T]} position={[0, H, D + T]} />
        </RigidBody>

        {dice.map((d) => (
          // Stable key — PhysicsDie applies new throws imperatively, no remount
          <PhysicsDie
            key={d.id}
            dieType={d.dieType}
            dieThrow={d.throw}
            style={d.style}
            tint={d.tint}
            onResult={(value) => onResult(d.id, value)}
          />
        ))}
      </Physics>
    </Canvas>
  );
}
