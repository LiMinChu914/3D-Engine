import { vec3 } from "../lib/glMatrix/src/index.js";
import { Object3D } from "../core/Object3D.js";

// [MODIFIED FROM ORIGINAL] Legacy Scene retained for backwards compatibility; use World for components.




export class Scene extends Object3D{
    constructor(){
        super();

        // Kept as an alias for older code. Object3D owns the canonical children list.
        this.objects = this.children;
        
        this.background = null;
        
        this.light = vec3.set(vec3.create(), 3.0, 3.0, 0.0);
        this.lightColor = new Float32Array([1.0, 0.96, 0.88]);
    }

    add(...objects) {
        super.add(...objects);
        return this;
    }

    rotateY_light(rad){
        vec3.rotateY(this.light, this.light, [0,0,0], rad);
    }
    
}
