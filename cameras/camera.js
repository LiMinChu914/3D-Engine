import { Object3D } from "../core/Object3D.js";
import { vec3, vec4, mat3, mat4 } from "../lib/glMatrix/src/index.js";


export class Camera extends Object3D{
    constructor(fFov = 90, fAspectRatio = 1, fFar = 1000, fNear = 0.001){
        super();

        this.vcamera = [0, 0, 0];
        //width / height
        this.fAspectRatio = fAspectRatio;

        this.fFov = fFov;
        this.fFovRad = 1 / Math.tan(((fFov / 2) / 180) * Math.PI);

        this.fFar = fFar;
        this.fNear = fNear;

        this.lookat;

        this.projectionMatrix = mat4.create();
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

    
}