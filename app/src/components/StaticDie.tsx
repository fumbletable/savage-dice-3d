import { DiceMesh } from "../meshes/DiceMesh";
import { DiceMaterial } from "../materials/DiceMaterial";
import type { DieType } from "../meshes/DiceMesh";
import type { DiceStyle } from "../materials/DiceMaterial";
import type { DiceTransform } from "../lib/types";

interface Props {
  dieType: DieType;
  style: DiceStyle;
  tint?: string;
  transform: DiceTransform;
}

/**
 * A die rendered at a fixed pose with no physics, no RigidBody.
 * Used by receivers who join after a roll already settled — we have
 * the final transform from metadata, there's no tumble left to show.
 */
export function StaticDie({ dieType, style, tint, transform }: Props) {
  const p = transform.position;
  const r = transform.rotation;
  return (
    <group position={[p.x, p.y, p.z]} quaternion={[r.x, r.y, r.z, r.w]}>
      <DiceMesh dieType={dieType}>
        <DiceMaterial style={style} tint={tint} />
      </DiceMesh>
    </group>
  );
}
