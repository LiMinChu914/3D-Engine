import { vec3, mat4 } from "../lib/glMatrix/src/index.js";

// [MODIFIED FROM ORIGINAL] Kept as an inheritance-based compatibility layer.
// New application code should compose Entity + Transform instead.

/** Base node for every transformable object in the scene graph. */
export class Object3D {
    constructor() {
        this.position = vec3.create();
        this.rotation = vec3.create();
        this.scale = vec3.fromValues(1, 1, 1);
        this.parent = null;
        this.children = [];
        this.visible = true;
        this.name = "";

        // Backwards-compatible aliases used by the original demo.
        this.translate = this.position;
        this.rad = this.rotation;
        this.world_matrix = mat4.create();
    }

    add(...objects) {
        for (const object of objects) {
            if (!object || object === this || object.parent === this) continue;
            object.parent?.remove(object);
            object.parent = this;
            this.children.push(object);
        }
        return this;
    }

    remove(object) {
        const index = this.children.indexOf(object);
        if (index !== -1) {
            this.children.splice(index, 1);
            object.parent = null;
        }
        return this;
    }

    traverse(callback) {
        callback(this);
        for (const child of this.children) child.traverse(callback);
    }

    set_rotateX(value) { this.rotation[0] = value; return this; }
    set_rotateY(value) { this.rotation[1] = value; return this; }
    set_rotateZ(value) { this.rotation[2] = value; return this; }

    set_translate(value) {
        vec3.copy(this.position, value);
        return this;
    }

    object_rotateX(value) { this.rotation[0] += value; return this; }
    object_rotateY(value) { this.rotation[1] += value; return this; }
    object_rotateZ(value) { this.rotation[2] += value; return this; }

    object_translate(value) {
        vec3.add(this.position, this.position, value);
        return this;
    }

    object_scale(value) {
        vec3.copy(this.scale, value);
        return this;
    }

    getLocalMatrix() {
        const matrix = mat4.create();
        mat4.translate(matrix, matrix, this.position);
        mat4.rotateZ(matrix, matrix, this.rotation[2]);
        mat4.rotateY(matrix, matrix, this.rotation[1]);
        mat4.rotateX(matrix, matrix, this.rotation[0]);
        mat4.scale(matrix, matrix, this.scale);
        return matrix;
    }

    updateWorldMatrix(parentMatrix = null) {
        const local = this.getLocalMatrix();
        if (parentMatrix) mat4.multiply(this.world_matrix, parentMatrix, local);
        else mat4.copy(this.world_matrix, local);

        for (const child of this.children) child.updateWorldMatrix(this.world_matrix);
        return this.world_matrix;
    }

    get_modelMatrix() {
        return this.updateWorldMatrix(this.parent?.world_matrix ?? null);
    }
}
