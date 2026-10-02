import { vec3, mat4 } from "../lib/glMatrix/src/index.js";
import { Component } from "./Component.js";

/** [NEW] Spatial data is composed onto an Entity instead of inherited from Object3D. */
export class Transform extends Component {
    constructor({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] } = {}) {
        super();
        this.position = vec3.clone(position);
        this.rotation = vec3.clone(rotation);
        this.scale = vec3.clone(scale);
        this.localMatrix = mat4.create();
        this.worldMatrix = mat4.create();
        this.parent = null;
        this.children = new Set();
        this.dirty = true;
    }

    markDirty() {
        this.dirty = true;
        for (const child of this.children) child.markDirty();
        return this;
    }

    setParent(parent = null) {
        if (parent === this || this.isAncestorOf(parent)) {
            throw new Error("Transform hierarchy cannot contain a cycle.");
        }
        this.parent?.children.delete(this);
        this.parent = parent;
        parent?.children.add(this);
        return this.markDirty();
    }

    isAncestorOf(transform) {
        for (let current = transform; current; current = current.parent) {
            if (current === this) return true;
        }
        return false;
    }

    setPosition(value) { vec3.copy(this.position, value); return this.markDirty(); }
    setRotation(value) { vec3.copy(this.rotation, value); return this.markDirty(); }
    setScale(value) { vec3.copy(this.scale, value); return this.markDirty(); }
    translate(value) { vec3.add(this.position, this.position, value); return this.markDirty(); }
    rotate(x = 0, y = 0, z = 0) {
        this.rotation[0] += x;
        this.rotation[1] += y;
        this.rotation[2] += z;
        return this.markDirty();
    }

    updateWorldMatrix(force = false) {
        if (this.parent) this.parent.updateWorldMatrix(force);
        if (this.dirty || force) {
            mat4.identity(this.localMatrix);
            mat4.translate(this.localMatrix, this.localMatrix, this.position);
            mat4.rotateZ(this.localMatrix, this.localMatrix, this.rotation[2]);
            mat4.rotateY(this.localMatrix, this.localMatrix, this.rotation[1]);
            mat4.rotateX(this.localMatrix, this.localMatrix, this.rotation[0]);
            mat4.scale(this.localMatrix, this.localMatrix, this.scale);
            if (this.parent) mat4.multiply(this.worldMatrix, this.parent.worldMatrix, this.localMatrix);
            else mat4.copy(this.worldMatrix, this.localMatrix);
            this.dirty = false;
        }
        return this.worldMatrix;
    }

    onDetach() {
        this.setParent(null);
        for (const child of [...this.children]) child.setParent(null);
    }
}
