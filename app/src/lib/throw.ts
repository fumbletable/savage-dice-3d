function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomRotation(): [number, number, number] {
  return [rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2)];
}

export type ThrowRegion = "full" | "left" | "right";

export function randomThrow(region: ThrowRegion = "full") {
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

  return {
    position: [x, rand(0.2, 0.6), z] as [number, number, number],
    rotation: randomRotation(),
    linearVelocity: [
      (-x / len) * speed,
      rand(0.5, 2.0),
      (-z / len) * speed,
    ] as [number, number, number],
    angularVelocity: [
      rand(8, 18),
      rand(8, 18),
      rand(8, 18),
    ] as [number, number, number],
  };
}
