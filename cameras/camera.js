import { Object3D } from "../core/Object3D.js";
import { vec3, mat4 } from "../lib/glMatrix/src/index.js";

// [MODIFIED FROM ORIGINAL] Legacy camera gained view/lookAt support; new code uses CameraComponent.


export class Camera extends Object3D{
    constructor(fFov = 90, fAspectRatio = 1, fFar = 1000, fNear = 0.001){
        super();

        this.vcamera = this.position;
        //width / height
        this.fAspectRatio = fAspectRatio;

        this.fFov = fFov;
        this.fFovRad = 1 / Math.tan(((fFov / 2) / 180) * Math.PI);

        this.fFar = fFar;
        this.fNear = fNear;

        this.target = vec3.fromValues(0, 0, 0);
        this.up = vec3.fromValues(0, 1, 0);

        this.projectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();
    }


    set_fFov(fFov){
        this.fFov = fFov;
        this.fFovRad = 1 / Math.tan((fFov / 2) / 180 * Math.PI);
    }

    set_fAspectRatio(fAspectRatio){
        this.fAspectRatio = fAspectRatio;
    }

    set_far_near(fFar, fNear){
        this.fFar = fFar;
        this.fNear = fNear;
    }

    update_projectionMatrix(){

        mat4.perspective(this.projectionMatrix, this.fFov/180*Math.PI, this.fAspectRatio, this.fNear, this.fFar);

        return this.projectionMatrix;
    }

    lookAt(target) {
        vec3.copy(this.target, target);
        return this;
    }

    update_viewMatrix() {
        mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
        return this.viewMatrix;
    }

    
}
