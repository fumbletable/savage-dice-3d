// Textured materials for dice, adapted from owlbear-rodeo/dice (GPL-3.0).
// Each pack has albedo + normal + orm (occlusion/roughness/metalness).
import { useTexture } from "@react-three/drei";
import { gltfTexture } from "../lib/gltfTexture";

import walnutAlbedo from "./walnut/albedo.jpg";
import walnutNormal from "./walnut/normal.jpg";
import walnutOrm from "./walnut/orm.jpg";

import ironAlbedo from "./iron/albedo.jpg";
import ironNormal from "./iron/normal.jpg";
import ironOrm from "./iron/orm.jpg";

import gemstoneAlbedo from "./gemstone/albedo.jpg";
import gemstoneNormal from "./gemstone/normal.jpg";
import gemstoneOrm from "./gemstone/orm.jpg";

import sunsetAlbedo from "./sunset/albedo.jpg";
import sunsetNormal from "./sunset/normal.jpg";
import sunsetOrm from "./sunset/orm.jpg";

export type DiceStyle = "walnut" | "iron" | "gemstone" | "sunset";

const MAPS: Record<DiceStyle, { albedo: string; normal: string; orm: string }> = {
  walnut: { albedo: walnutAlbedo, normal: walnutNormal, orm: walnutOrm },
  iron: { albedo: ironAlbedo, normal: ironNormal, orm: ironOrm },
  gemstone: { albedo: gemstoneAlbedo, normal: gemstoneNormal, orm: gemstoneOrm },
  sunset: { albedo: sunsetAlbedo, normal: sunsetNormal, orm: sunsetOrm },
};

interface Props {
  style: DiceStyle;
  tint?: string; // multiplies over the albedo, useful for e.g. red wild die
}

export function DiceMaterial({ style, tint }: Props) {
  const { albedo, normal, orm } = MAPS[style];
  const [albedoMap, ormMap, normalMap] = useTexture(
    [albedo, orm, normal],
    (textures) => gltfTexture(textures, ["SRGB", "LINEAR", "LINEAR"]),
  );
  return (
    <meshStandardMaterial
      map={albedoMap}
      aoMap={ormMap}
      roughnessMap={ormMap}
      metalnessMap={ormMap}
      normalMap={normalMap}
      color={tint}
    />
  );
}
