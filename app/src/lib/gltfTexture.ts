// Adapted from owlbear-rodeo/dice (GPL-3.0).
// Configures textures for use with a GLTF-style PBR material in Three.js.
import * as THREE from "three";

type Encoding = "LINEAR" | "SRGB";

export function gltfTexture(
  textures: THREE.Texture | THREE.Texture[],
  encodings: Encoding | Encoding[],
) {
  if (Array.isArray(textures) && Array.isArray(encodings)) {
    if (textures.length !== encodings.length) {
      throw new Error("Textures and encodings must have the same length");
    }
    for (let i = 0; i < textures.length; i++) {
      const texture = textures[i];
      const encoding = encodings[i];
      texture.flipY = false;
      texture.colorSpace =
        encoding === "SRGB" ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
    }
  } else if (Array.isArray(textures) || Array.isArray(encodings)) {
    throw new Error("Textures and encodings must match types");
  } else {
    (textures as THREE.Texture).flipY = false;
    (textures as THREE.Texture).colorSpace =
      encodings === "SRGB" ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  }
}
