// Plugin id + OBR helpers.

/** Reverse-domain plugin id, namespaced so our metadata doesn't collide with OBR's
 *  own dice extension (which uses "rodeo.owlbear.dice/..."). */
export function getPluginId(path: string): string {
  return `com.fumbletable.savage-dice-3d/${path}`;
}

export const ROLL_KEY = getPluginId("roll");
export const ROLL_THROWS_KEY = getPluginId("rollThrows");
export const ROLL_CHAINS_KEY = getPluginId("rollChains");
export const ROLL_DONE_KEY = getPluginId("rollDone");
export const ROLL_TRANSFORMS_KEY = getPluginId("rollTransforms");
