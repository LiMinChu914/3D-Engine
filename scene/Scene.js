import { vec3, vec4, mat3, mat4 } from "../lib/glMatrix/src/index.js";
import { Object3D } from "../core/Object3D.js";




export class Scene extends Object3D{
    constructor(){
        super();

        this.objects = [];
        
        this.background = null;
        
        this.light = vec3.set(vec3.create(), 3.0, 3.0, 0.0);
    }

    add(object){
        if(arguments.length > 1){
            for(let i = 0; i < arguments.length; i++){
                this.add(arguments[i]);
            }
        }
        else if(object == this){
            console.log("this object is exist");
        }
        else{
            this.objects.push(object);
        }
    }

    rotateY_light(rad){
        vec3.rotateY(this.light, this.light, [0,0,0], rad);
    }
    
}