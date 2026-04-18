/**
 * Dice mesh components using GLB geometry + materials from owlbear-rodeo/dice
 * Source: https://github.com/owlbear-rodeo/dice (GPL-3.0)
 *
 * Locator child groups mark face centres. getValueFromDiceGroup()
 * detects which locator points most upward after the die settles.
 *
 * Each locator now hosts a <FaceLabel> that renders its number onto the face.
 */
import React from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

import d4Glb from "./d4.glb?url";
import d6Glb from "./d6.glb?url";
import d8Glb from "./d8.glb?url";
import d10Glb from "./d10.glb?url";
import d12Glb from "./d12.glb?url";
import { FaceLabel } from "./FaceLabel";

export type DieType = "d4" | "d6" | "d8" | "d10" | "d12";

// ─── D4 ────────────────────────────────────────────────────────────────────
export const D4Mesh = React.forwardRef<THREE.Group, React.JSX.IntrinsicElements["group"]>(
  ({ children, ...props }, ref) => {
    const { nodes } = useGLTF(d4Glb) as any;
    return (
      <group ref={ref} {...props} scale={0.5} dispose={null}>
        <group name="dice">
          <mesh name="d4" castShadow receiveShadow geometry={nodes.d4.geometry}>
            {children}
            <group name="004_locator_1" position={[0, -0.61, -1.27]} rotation={[-1.92, 0, 0]}>
              <FaceLabel value="1" size={0.7} />
            </group>
            <group name="004_locator_2" position={[-1.1, -0.61, 0.63]} rotation={[-1.39, -0.3, 2.12]}>
              <FaceLabel value="2" size={0.7} />
            </group>
            <group name="004_locator_3" position={[1.1, -0.61, 0.63]} rotation={[-1.39, 0.3, -2.12]}>
              <FaceLabel value="3" size={0.7} />
            </group>
            <group name="004_locator_4" position={[0, 1.18, 0]}>
              <FaceLabel value="4" size={0.7} />
            </group>
          </mesh>
        </group>
      </group>
    );
  }
);

// ─── D6 ────────────────────────────────────────────────────────────────────
export const D6Mesh = React.forwardRef<THREE.Group, React.JSX.IntrinsicElements["group"]>(
  ({ children, ...props }, ref) => {
    const gltf = useGLTF(d6Glb) as any;
    const { nodes } = gltf;
    return (
      <group ref={ref} {...props} scale={0.5} dispose={null}>
        <group name="dice">
          <mesh name="d6" castShadow receiveShadow geometry={nodes.d6.geometry}>
            {children}
            <group name="006_locator_1" position={[0, -0.77, 0]} rotation={[Math.PI, -1.57, 0]}>
              <FaceLabel value="1" size={0.75} />
            </group>
            <group name="006_locator_2" position={[-0.77, 0, 0]} rotation={[-Math.PI, 0, Math.PI / 2]}>
              <FaceLabel value="2" size={0.75} />
            </group>
            <group name="006_locator_3" position={[0, 0, 0.77]} rotation={[Math.PI / 2, -1.57, 0]}>
              <FaceLabel value="3" size={0.75} />
            </group>
            <group name="006_locator_4" position={[0, 0, -0.77]} rotation={[-Math.PI / 2, Math.PI / 2, 0]}>
              <FaceLabel value="4" size={0.75} />
            </group>
            <group name="006_locator_5" position={[0.77, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <FaceLabel value="5" size={0.75} />
            </group>
            <group name="006_locator_6" position={[0, 0.77, 0]}>
              <FaceLabel value="6" size={0.75} />
            </group>
          </mesh>
        </group>
      </group>
    );
  }
);

// ─── D8 ────────────────────────────────────────────────────────────────────
export const D8Mesh = React.forwardRef<THREE.Group, React.JSX.IntrinsicElements["group"]>(
  ({ children, ...props }, ref) => {
    const { nodes } = useGLTF(d8Glb) as any;
    return (
      <group ref={ref} {...props} scale={0.5} dispose={null}>
        <group name="dice">
          <mesh name="d8" castShadow receiveShadow geometry={nodes.d8.geometry}>
            {children}
            <group name="008_locator_1" position={[0.42, 0.52, 0.43]} rotation={[1.11, 0.42, -0.68]}>
              <FaceLabel value="1" size={0.55} />
            </group>
            <group name="008_locator_2" position={[-0.47, -0.46, -0.45]} rotation={[1.12, 0.43, 2.45]}>
              <FaceLabel value="2" size={0.55} />
            </group>
            <group name="008_locator_3" position={[0.45, -0.46, -0.47]} rotation={[1.09, -0.41, -2.46]}>
              <FaceLabel value="3" size={0.55} />
            </group>
            <group name="008_locator_4" position={[-0.43, 0.52, 0.42]} rotation={[1.11, -0.42, 0.69]}>
              <FaceLabel value="4" size={0.55} />
            </group>
            <group name="008_locator_5" position={[-0.42, 0.52, -0.43]} rotation={[2.04, -0.42, 2.46]}>
              <FaceLabel value="5" size={0.55} />
            </group>
            <group name="008_locator_6" position={[0.47, -0.46, 0.45]} rotation={[2.02, -0.43, -0.69]}>
              <FaceLabel value="6" size={0.55} />
            </group>
            <group name="008_locator_7" position={[-0.45, -0.46, 0.47]} rotation={[2.05, 0.41, 0.68]}>
              <FaceLabel value="7" size={0.55} />
            </group>
            <group name="008_locator_8" position={[0.43, 0.52, -0.42]} rotation={[2.03, 0.42, -2.46]}>
              <FaceLabel value="8" size={0.55} />
            </group>
          </mesh>
        </group>
      </group>
    );
  }
);

// ─── D10 ───────────────────────────────────────────────────────────────────
// SWADE convention: the "0" face reads as 10. Label it as "10" directly.
export const D10Mesh = React.forwardRef<THREE.Group, React.JSX.IntrinsicElements["group"]>(
  ({ children, ...props }, ref) => {
    const { nodes } = useGLTF(d10Glb) as any;
    return (
      <group ref={ref} {...props} scale={0.5} dispose={null}>
        <group name="dice">
          <mesh name="d10" castShadow receiveShadow geometry={nodes.d10.geometry}>
            {children}
            <group name="010_locator_0" position={[0.4, 0.42, -0.56]} rotation={[2.21, 0.4, -2.65]}>
              <FaceLabel value="10" size={0.55} />
            </group>
            <group name="010_locator_1" position={[-0.7, -0.37, -0.22]} rotation={[1.27, 0.68, 2]}>
              <FaceLabel value="1" size={0.55} />
            </group>
            <group name="010_locator_2" position={[0.01, 0.42, 0.69]} rotation={[0.83, 0.01, 0]}>
              <FaceLabel value="2" size={0.55} />
            </group>
            <group name="010_locator_3" position={[0.69, -0.37, -0.23]} rotation={[1.33, -0.7, -1.97]}>
              <FaceLabel value="3" size={0.55} />
            </group>
            <group name="010_locator_4" position={[-0.41, 0.42, -0.55]} rotation={[2.2, -0.42, 2.65]}>
              <FaceLabel value="4" size={0.55} />
            </group>
            <group name="010_locator_5" position={[0.44, -0.37, 0.59]} rotation={[2.22, -0.39, -0.49]}>
              <FaceLabel value="5" size={0.55} />
            </group>
            <group name="010_locator_6" position={[-0.65, 0.42, 0.22]} rotation={[1.28, -0.69, 1.15]}>
              <FaceLabel value="6" size={0.55} />
            </group>
            <group name="010_locator_7" position={[-0.01, -0.37, -0.73]} rotation={[0.83, -0.02, -Math.PI]}>
              <FaceLabel value="7" size={0.55} />
            </group>
            <group name="010_locator_8" position={[0.66, 0.42, 0.21]} rotation={[1.31, 0.7, -1.17]}>
              <FaceLabel value="8" size={0.55} />
            </group>
            <group name="010_locator_9" position={[-0.42, -0.37, 0.6]} rotation={[2.19, 0.43, 0.5]}>
              <FaceLabel value="9" size={0.55} />
            </group>
          </mesh>
        </group>
      </group>
    );
  }
);

// ─── D12 ───────────────────────────────────────────────────────────────────
export const D12Mesh = React.forwardRef<THREE.Group, React.JSX.IntrinsicElements["group"]>(
  ({ children, ...props }, ref) => {
    const { nodes } = useGLTF(d12Glb) as any;
    return (
      <group ref={ref} {...props} scale={0.5} dispose={null}>
        <group name="dice">
          <mesh name="d12" castShadow receiveShadow geometry={nodes.d12.geometry}>
            {children}
            <group name="012_locator_1" position={[0, -0.93, 0]} rotation={[0, 0, Math.PI]}>
              <FaceLabel value="1" size={0.55} />
            </group>
            <group name="012_locator_2" position={[-0.25, -0.41, -0.8]} rotation={[-2.01, -0.14, 0.28]}>
              <FaceLabel value="2" size={0.55} />
            </group>
            <group name="012_locator_3" position={[-0.67, 0.44, 0.5]} rotation={[1.29, -0.37, 0.89]}>
              <FaceLabel value="3" size={0.55} />
            </group>
            <group name="012_locator_4" position={[-0.84, -0.41, -0.01]} rotation={[-1.57, -0.46, 1.57]}>
              <FaceLabel value="4" size={0.55} />
            </group>
            <group name="012_locator_5" position={[0.67, -0.41, 0.5]} rotation={[-1.29, 0.37, -2.25]}>
              <FaceLabel value="5" size={0.55} />
            </group>
            <group name="012_locator_6" position={[-0.27, -0.41, 0.79]} rotation={[-1.13, -0.13, 2.86]}>
              <FaceLabel value="6" size={0.55} />
            </group>
            <group name="012_locator_7" position={[0.25, 0.44, -0.8]} rotation={[2.01, 0.14, -2.86]}>
              <FaceLabel value="7" size={0.55} />
            </group>
            <group name="012_locator_8" position={[-0.68, 0.44, -0.48]} rotation={[1.86, -0.37, 2.25]}>
              <FaceLabel value="8" size={0.55} />
            </group>
            <group name="012_locator_9" position={[0.84, 0.44, -0.01]} rotation={[1.57, 0.46, -1.57]}>
              <FaceLabel value="9" size={0.55} />
            </group>
            <group name="012_locator_10" position={[0.68, -0.41, -0.48]} rotation={[-1.86, 0.37, -0.89]}>
              <FaceLabel value="10" size={0.55} />
            </group>
            <group name="012_locator_11" position={[0.27, 0.44, 0.79]} rotation={[1.13, 0.13, -0.28]}>
              <FaceLabel value="11" size={0.55} />
            </group>
            <group name="012_locator_12" position={[0, 0.96, 0]}>
              <FaceLabel value="12" size={0.55} />
            </group>
          </mesh>
        </group>
      </group>
    );
  }
);

// ─── Router ────────────────────────────────────────────────────────────────
export const DiceMesh = React.forwardRef<THREE.Group, React.JSX.IntrinsicElements["group"] & { dieType: DieType }>(
  ({ dieType, ...props }, ref) => {
    switch (dieType) {
      case "d4":  return <D4Mesh ref={ref} {...props} />;
      case "d6":  return <D6Mesh ref={ref} {...props} />;
      case "d8":  return <D8Mesh ref={ref} {...props} />;
      case "d10": return <D10Mesh ref={ref} {...props} />;
      case "d12": return <D12Mesh ref={ref} {...props} />;
    }
  }
);

// Preload all
useGLTF.preload(d4Glb);
useGLTF.preload(d6Glb);
useGLTF.preload(d8Glb);
useGLTF.preload(d10Glb);
useGLTF.preload(d12Glb);
