import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { PhysicsDie } from "./PhysicsDie";
import type { DieThrow } from "./PhysicsDie";
import type { DieType } from "../meshes/DiceMesh";

export interface SceneDie {
  id: string;
  dieType: DieType;
  throw: DieThrow;
  colour: string;
}

interface Props {
  dice: SceneDie[];
  onResult: (id: string, value: number) => void;
}

const W = 2.0; // half-width (X)
const D = 3.2; // half-depth (Z)
const T = 0.5; // wall thickness (enough to catch fast dice)
const H = 5;   // wall half-height

export function DiceScene({ dice, onResult }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 9, 1.5], fov: 38 }}
      shadows
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#1e1e38"]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[6, 4, 4]} intensity={1.8} castShadow />
      <directionalLight position={[-4, 3, -2]} intensity={0.5} />

      <Physics gravity={[0, -20, 0]}>
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
          <PhysicsDie
            key={`${d.id}-${JSON.stringify(d.throw)}`}
            dieType={d.dieType}
            dieThrow={d.throw}
            color={d.colour}
            onResult={(value) => onResult(d.id, value)}
          />
        ))}
      </Physics>
    </Canvas>
  );
}
