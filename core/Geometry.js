import { vec3 } from "../lib/glMatrix/src/index.js";

// [MODIFIED] UVs now belong to Geometry attributes instead of Material.
// Bounding volumes are calculated for large-world visibility culling.

export class Geometry {
    constructor(vertices, indices, normals = null, uvs = null) {
        this.vertices = new Float32Array(vertices);
        this.indices = indices instanceof Uint32Array ? indices : new Uint16Array(indices);
        this.vertice_num = Math.floor(this.vertices.length / 3);

        this.normals = normals ? new Float32Array(normals) : new Float32Array(this.vertices.length);
        this.uvs = uvs ? new Float32Array(uvs) : new Float32Array(this.vertice_num * 2);

        this.center =  vec3.set(vec3.create(), 0, 0, 0);
        this.boundingBox = { min: vec3.create(), max: vec3.create() };
        this.boundingSphere = { center: vec3.create(), radius: 0 };
        this.computeBounds();
    }

    get_vertices_reference(call_back) {
        for (let i = 0; i < this.vertice_num; i++) {
            const v = new Float32Array(this.vertices.buffer, i*3*Float32Array.BYTES_PER_ELEMENT, 3);
            call_back(v);
        }
    }

    set_vertices(vertices) {
        this.vertices = new Float32Array(vertices);
        this.vertice_num = Math.floor(this.vertices.length / 3);
        this.computeBounds();
        return this;
    }

    get_vertices() {
        return this.vertices;
    }

    set_indices(indices) {
        this.indices = indices instanceof Uint32Array ? indices : new Uint16Array(indices);
        return this;
    }

    get_indices() {
        return this.indices;
    }

    set_uvs(uvs) {
        this.uvs = new Float32Array(uvs);
        return this;
    }

    computeBounds() {
        const min = this.boundingBox.min;
        const max = this.boundingBox.max;
        vec3.set(min, Infinity, Infinity, Infinity);
        vec3.set(max, -Infinity, -Infinity, -Infinity);
        for (let i = 0; i < this.vertices.length; i += 3) {
            min[0] = Math.min(min[0], this.vertices[i]);
            min[1] = Math.min(min[1], this.vertices[i + 1]);
            min[2] = Math.min(min[2], this.vertices[i + 2]);
            max[0] = Math.max(max[0], this.vertices[i]);
            max[1] = Math.max(max[1], this.vertices[i + 1]);
            max[2] = Math.max(max[2], this.vertices[i + 2]);
        }
        vec3.add(this.boundingSphere.center, min, max);
        vec3.scale(this.boundingSphere.center, this.boundingSphere.center, 0.5);
        let radiusSquared = 0;
        for (let i = 0; i < this.vertices.length; i += 3) {
            const dx = this.vertices[i] - this.boundingSphere.center[0];
            const dy = this.vertices[i + 1] - this.boundingSphere.center[1];
            const dz = this.vertices[i + 2] - this.boundingSphere.center[2];
            radiusSquared = Math.max(radiusSquared, dx * dx + dy * dy + dz * dz);
        }
        this.boundingSphere.radius = Math.sqrt(radiusSquared);
        return this;
    }

    rotateX(rad) {
        const center = this.center;

        this.get_vertices_reference(function (v){
            vec3.rotateX(v, v, center, rad);
        });
        this.computeBounds();
    }

    rotateY(rad) {
        const center = this.center;

        this.get_vertices_reference(function (v){
            vec3.rotateY(v, v, center, rad);
        });
        this.computeBounds();
    }

    rotateZ(rad) {
        const center = this.center;

        this.get_vertices_reference(function (v){
            vec3.rotateZ(v, v, center, rad);
        });
        this.computeBounds();
    }

    translate(translation) {
        this.get_vertices_reference(function (v){
            vec3.add(v, v, translation);
        });
        this.computeBounds();
    }

}
