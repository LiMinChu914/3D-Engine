import { vec3 } from "../lib/glMatrix/src/index.js";

/** [NEW] Shared geometry utility used by both legacy Mesh and MeshRenderer component. */
export function computeTangents(vertices, uvs, indices) {
    const tangents = new Float32Array(vertices.length);
    for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i], b = indices[i + 1], c = indices[i + 2];
        const a3 = a * 3, b3 = b * 3, c3 = c * 3;
        const va = vertices.subarray(a3, a3 + 3);
        const vb = vertices.subarray(b3, b3 + 3);
        const vc = vertices.subarray(c3, c3 + 3);
        const uva = uvs.subarray(a * 2, a * 2 + 2);
        const uvb = uvs.subarray(b * 2, b * 2 + 2);
        const uvc = uvs.subarray(c * 2, c * 2 + 2);
        const edge1 = vec3.subtract(vec3.create(), vb, va);
        const edge2 = vec3.subtract(vec3.create(), vc, va);
        const du1 = uvb[0] - uva[0], dv1 = uvb[1] - uva[1];
        const du2 = uvc[0] - uva[0], dv2 = uvc[1] - uva[1];
        const determinant = du1 * dv2 - du2 * dv1;
        if (Math.abs(determinant) < 1e-8) continue;
        const reciprocal = 1 / determinant;
        const tangent = vec3.fromValues(
            reciprocal * (dv2 * edge1[0] - dv1 * edge2[0]),
            reciprocal * (dv2 * edge1[1] - dv1 * edge2[1]),
            reciprocal * (dv2 * edge1[2] - dv1 * edge2[2])
        );
        for (const offset of [a3, b3, c3]) {
            vec3.add(tangents.subarray(offset, offset + 3), tangents.subarray(offset, offset + 3), tangent);
        }
    }
    for (let i = 0; i < tangents.length; i += 3) {
        vec3.normalize(tangents.subarray(i, i + 3), tangents.subarray(i, i + 3));
    }
    return tangents;
}
