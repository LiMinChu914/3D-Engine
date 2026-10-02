import { vec3, mat4 } from "../lib/glMatrix/src/index.js";

/** [NEW — LARGE WORLD] Six-plane camera frustum for chunk visibility culling. */
export class Frustum {
    constructor() {
        this.planes = Array.from({ length: 6 }, () => new Float32Array(4));
        this.matrix = mat4.create();
        this.worldCenter = vec3.create();
    }

    setFromMatrices(projection, view) {
        const m = mat4.multiply(this.matrix, projection, view);
        this.setPlane(0, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]);
        this.setPlane(1, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
        this.setPlane(2, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]);
        this.setPlane(3, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
        this.setPlane(4, m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]);
        this.setPlane(5, m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);
        return this;
    }

    setPlane(index, x, y, z, w) {
        const length = Math.hypot(x, y, z) || 1;
        const plane = this.planes[index];
        plane[0] = x / length;
        plane[1] = y / length;
        plane[2] = z / length;
        plane[3] = w / length;
    }

    intersectsGeometry(geometry, modelMatrix) {
        const sphere = geometry.boundingSphere;
        vec3.transformMat4(this.worldCenter, sphere.center, modelMatrix);
        const scaleX = Math.hypot(modelMatrix[0], modelMatrix[1], modelMatrix[2]);
        const scaleY = Math.hypot(modelMatrix[4], modelMatrix[5], modelMatrix[6]);
        const scaleZ = Math.hypot(modelMatrix[8], modelMatrix[9], modelMatrix[10]);
        const radius = sphere.radius * Math.max(scaleX, scaleY, scaleZ);
        for (const plane of this.planes) {
            const distance = plane[0] * this.worldCenter[0]
                + plane[1] * this.worldCenter[1]
                + plane[2] * this.worldCenter[2]
                + plane[3];
            if (distance < -radius) return false;
        }
        return true;
    }
}
