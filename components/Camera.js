import { vec3, mat4 } from "../lib/glMatrix/src/index.js";
import { Component } from "./Component.js";
import { Transform } from "./Transform.js";

/** [NEW] Camera behaviour attached to any Entity that also owns a Transform. */
export class CameraComponent extends Component {
    constructor({ fov = 36, aspect = 1, near = 0.01, far = 100, target = [0, 0, 0] } = {}) {
        super();
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.target = vec3.clone(target);
        this.up = vec3.fromValues(0, 1, 0);
        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
    }

    onAttach(entity) {
        if (!entity.has(Transform)) entity.add(new Transform());
    }

    lookAt(target) { vec3.copy(this.target, target); return this; }

    updateMatrices(aspect = this.aspect) {
        this.aspect = aspect;
        const transform = this.entity.get(Transform);
        const worldPosition = transform.updateWorldMatrix().subarray(12, 15);
        mat4.lookAt(this.viewMatrix, worldPosition, this.target, this.up);
        mat4.perspective(this.projectionMatrix, this.fov * Math.PI / 180, this.aspect, this.near, this.far);
        return this;
    }
}
