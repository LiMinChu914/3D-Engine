import { vec3, vec4, mat3, mat4 } from "../lib/glMatrix/src/index.js";


export class Material{
    constructor( texture, normalMap, uvs){
        this.map = texture;
        this.uvs_per_vertex = uvs;
        this.normalMap = normalMap;

        this.texture_loaded = false;
        this.texture_number = null;

        this.color = new Float32Array([1.0, 1.0, 1.0, 1.0]);
    }

}