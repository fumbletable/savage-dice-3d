import * as THREE from "three";
import type { DiceThrow } from "./types";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// Random quaternion via uniform sampling on SO(3) — Shoemake's method.
// Produces an even spread of dice orientations; Euler-from-random-angles is biased.
function randomQuaternion(): THREE.Quaternion {
  const u1 = Math.random();
  const u2 = Math.random();
  const u3 = Math.random();
  const s1 = Math.sqrt(1 - u1);
  const s2 = Math.sqrt(u1);
  return new THREE.Quaternion(
    s1 * Math.sin(2 * Math.PI * u2),
    s1 * Math.cos(2 * Math.PI * u2),
    s2 * Math.sin(2 * Math.PI * u3),
    s2 * Math.cos(2 * Math.PI * u3),
  );
}

export type ThrowRegion = "full" | "left" | "right";

export function randomThrow(region: ThrowRegion = "full"): DiceThrow {
  // Start near tray edge, fire hard toward centre with lots of spin.
  // Left/right regions keep trait + wild dice from spawning on top of each other.
  const xRange: [number, number] =
    region === "left" ? [-1.6, -0.3] :
    region === "right" ? [0.3, 1.6] :
    [-1.6, 1.6];

  const x = rand(xRange[0], xRange[1]);
  const z = rand(-2.6, 2.6);
  const len = Math.sqrt(x * x + z * z) || 1;
  const speed = rand(5, 9);
  const q = randomQuaternion();

  return {
    position: { x, y: rand(0.2, 0.6), z },
    rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
    linearVelocity: {
      x: (-x / len) * speed,
      y: rand(0.5, 2.0),
      z: (-z / len) * speed,
    },
    angularVelocity: {
      x: rand(8, 18),
      y: rand(8, 18),
      z: rand(8, 18),
    },
  };
}
