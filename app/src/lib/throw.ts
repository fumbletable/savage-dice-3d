function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomRotation(): [number, number, number] {
  return [rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2)];
}

export function randomThrow() {
  // Start near tray edge, fire hard toward centre with lots of spin
  const x = rand(-1.6, 1.6);
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
