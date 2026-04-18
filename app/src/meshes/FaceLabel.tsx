/**
 * FaceLabel — draws a number on a die face.
 *
 * Placed as a child of a locator group. The locator's local +Y axis points
 * outward from the face, so we offset the label along that axis and rotate
 * it flat onto the face. No font CDN; everything renders from a runtime
 * canvas texture so it works inside OBR's iframe sandbox.
 */
import { useMemo } from "react";
import * as THREE from "three";

export interface FaceLabelProps {
  value: string;
  /** Half-size of the square label plane, in locator-local units. */
  size?: number;
  /** How far the label sits above the face surface (prevents z-fighting). */
  offset?: number;
  /** Digit colour drawn onto the transparent canvas. */
  colour?: string;
  /** Font-weight + family used on the canvas. */
  font?: string;
  /** Rotate the label within the face plane (radians). Some faces need a tweak. */
  spin?: number;
}

function createNumberTexture(value: string, colour: string, font: string) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = colour;
  // Shrink size for 2-character labels (10) so they fit within the face.
  const pxSize = value.length > 1 ? size * 0.55 : size * 0.72;
  ctx.font = `700 ${pxSize}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, size / 2, size / 2 + size * 0.02); // small optical nudge

  // Subtle underline for 6 and 9 so they're distinguishable at odd rotations
  if (value === "6" || value === "9") {
    ctx.fillRect(size * 0.35, size * 0.78, size * 0.3, size * 0.04);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.anisotropy = 4;
  return tex;
}

export function FaceLabel({
  value,
  size = 0.55,
  offset = 0.05,
  colour = "#1a1a2e",
  font = "system-ui, -apple-system, sans-serif",
  spin = 0,
}: FaceLabelProps) {
  const texture = useMemo(
    () => createNumberTexture(value, colour, font),
    [value, colour, font],
  );

  return (
    <mesh
      position={[0, offset, 0]}
      rotation={[-Math.PI / 2, spin, 0]}
      renderOrder={1}
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        map={texture}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}
