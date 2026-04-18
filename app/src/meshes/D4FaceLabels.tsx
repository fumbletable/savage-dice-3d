/**
 * Old-school D&D d4 labelling — 3 numbers per face, at each vertex.
 *
 * Each vertex v_j of the tetrahedron is shared by 3 faces (every face except
 * F_j). On each of those faces, we write "j" at vertex v_j. Result: when the
 * die rests on face F_k, the top vertex is v_k and the three visible faces
 * all show "k" near that top vertex — the classic D&D d4 read.
 */
import { useMemo } from "react";
import * as THREE from "three";
import { FaceLabel } from "./FaceLabel";

// OBR's d4 vertex positions (= locator positions). The tetrahedron isn't
// perfectly regular — locator_4 is slightly closer to centre — but we take
// them at face value.
const V: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
  new THREE.Vector3(0, -0.61, -1.27),   // v1
  new THREE.Vector3(-1.1, -0.61, 0.63), // v2
  new THREE.Vector3(1.1, -0.61, 0.63),  // v3
  new THREE.Vector3(0, 1.18, 0),        // v4
];

const LABEL_OFFSET = 0.06;
const LABEL_SIZE = 0.42;
// How far to pull each label in from the vertex tip toward the face centroid
// (0 = label sits right at the vertex, 1 = label at centroid). ~0.3 puts the
// number on the face surface near the vertex, classic D&D d4 look.
const VERTEX_INSET = 0.3;

interface PositionedLabel {
  key: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  value: string;
  spinInFace: number;
}

function computeLabels(): PositionedLabel[] {
  const out: PositionedLabel[] = [];

  for (let i = 0; i < 4; i++) {
    const oppositeVertex = V[i];
    // Face F_(i+1) is opposite vertex v_(i+1). Its outward normal points
    // away from that vertex (through the centre of the tetrahedron).
    const faceNormal = oppositeVertex.clone().normalize().negate();

    // The other three vertices are the corners of this face.
    const faceVertexIdx = [0, 1, 2, 3].filter((k) => k !== i);
    const faceVerts = faceVertexIdx.map((k) => V[k]);
    const faceCentroid = new THREE.Vector3()
      .add(faceVerts[0]).add(faceVerts[1]).add(faceVerts[2])
      .divideScalar(3);

    for (const j of faceVertexIdx) {
      const vj = V[j];

      // Anchor the label partway from vertex toward the face centroid, so
      // it sits on the face surface instead of being crammed at the tip.
      const anchor = vj.clone().lerp(faceCentroid, VERTEX_INSET);

      // Then push outward along the face normal so it clears the surface.
      const position = anchor.add(faceNormal.clone().multiplyScalar(LABEL_OFFSET));

      // The label's "up" direction within the face plane points from the
      // centroid toward this vertex. That way, when v_j is the top vertex
      // of the resting die, every label at v_j reads upright.
      const radial = vj.clone().sub(faceCentroid);
      const upInPlane = radial
        .clone()
        .sub(faceNormal.clone().multiplyScalar(radial.dot(faceNormal)))
        .normalize();

      // Build a rotation for the parent group such that, after FaceLabel's
      // internal rotation [-π/2, 0, 0] (which maps label-+Y → parent-(-Z) and
      // label-+Z → parent-(+Y)), we end up with:
      //   label normal = faceNormal         → parent +Y = faceNormal
      //   label "up"  = upInPlane (outward) → parent -Z = upInPlane
      // So parent +Z = -upInPlane, and for a right-handed basis,
      //   parent +X = +Y × +Z = faceNormal × (-upInPlane) = upInPlane × faceNormal.
      const right = new THREE.Vector3()
        .crossVectors(upInPlane, faceNormal)
        .normalize();
      const zAxis = upInPlane.clone().negate();
      const m = new THREE.Matrix4().makeBasis(right, faceNormal, zAxis);
      const q = new THREE.Quaternion().setFromRotationMatrix(m);

      out.push({
        key: `f${i + 1}-v${j + 1}`,
        position: [position.x, position.y, position.z],
        quaternion: [q.x, q.y, q.z, q.w],
        value: String(j + 1),
        spinInFace: 0,
      });
    }
  }

  return out;
}

export function D4FaceLabels() {
  const labels = useMemo(() => computeLabels(), []);
  return (
    <>
      {labels.map((l) => (
        <group
          key={l.key}
          position={l.position}
          quaternion={l.quaternion}
        >
          <FaceLabel value={l.value} size={LABEL_SIZE} offset={0} spin={l.spinInFace} />
        </group>
      ))}
    </>
  );
}
