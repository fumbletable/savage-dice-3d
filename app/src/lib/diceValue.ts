import * as THREE from "three";

const up = new THREE.Vector3(0, 1, 0);
const locatorWorld = new THREE.Vector3();
const meshWorld = new THREE.Vector3();

/**
 * Read the value from a dice group using the locator system.
 * Locators are named "{die}_{locator}_{value}" — e.g. "006_locator_6".
 * We find which locator points most upward (highest dot product with world up).
 */
export function getValueFromDiceGroup(parent: THREE.Object3D): number {
  const dice = parent.getObjectByName("dice");
  const mesh = dice?.children[0];
  if (!mesh) return 0;

  let highestDot = -Infinity;
  let result = 0;

  mesh.getWorldPosition(meshWorld);

  for (const locator of mesh.children) {
    if (!locator.name.includes("locator")) continue;
    locator.getWorldPosition(locatorWorld);
    const dir = locatorWorld.clone().sub(meshWorld).normalize();
    const dot = dir.dot(up);
    if (dot > highestDot) {
      highestDot = dot;
      // Value is the last segment of the name: "006_locator_6" → 6
      const parts = locator.name.split("_");
      result = parseInt(parts[parts.length - 1]);
    }
  }

  return result;
}
