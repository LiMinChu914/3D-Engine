import { vec3, vec4, mat3, mat4 } from "../lib/glMatrix/src/index.js";



export class Object3D{
    constructor(){
        this.rad = vec3.create();
        this.translate = vec3.create();
        this.scale = vec3.set(vec3.create(), 1, 1, 1);

        //this.transformMatrix = mat4.create();
        this.world_matrix = mat4.create();
        
    }
    
    //set attribite of position
    set_rotateX(rad){
        this.rad[0] = rad;
    }

    set_rotateY(rad){
        this.rad[1] = rad;
    }
    
    set_rotateZ(rad){
        this.rad[2] = rad;
    }

    set_translate(translation){
        vec3.set(this.translate, this.translate, translation);
    }
    //change attribite of position
    object_rotateX(rad){
        this.rad[0] += rad;
    }

    object_rotateY(rad){
        this.rad[1] += rad;
    }
    
    object_rotateZ(rad){
        this.rad[2] += rad;
    }

    object_translate(translation){
        vec3.add(this.translate, this.translate, translation);
    }

    object_scale(scale){
        this.scale = scale;
    }

    get_modelMatrix(){
        let modelMatrix = mat4.create();

        mat4.multiply(modelMatrix, mat4.fromScaling(mat4.create(), this.scale), modelMatrix);
        mat4.multiply(modelMatrix, mat4.fromXRotation(mat4.create(), this.rad[0]), modelMatrix);
        mat4.multiply(modelMatrix, mat4.fromYRotation(mat4.create(), this.rad[1]), modelMatrix);
        mat4.multiply(modelMatrix, mat4.fromZRotation(mat4.create(), this.rad[2]), modelMatrix);
        mat4.multiply(modelMatrix, mat4.fromTranslation(mat4.create(), this.translate), modelMatrix);
        
        return modelMatrix;
    }

    
    
}