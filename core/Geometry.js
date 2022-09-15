import { vec3, vec4, mat3, mat4 } from "../lib/glMatrix/src/index.js";



export class Geometry {
    constructor(vertices, indices, normals = null) {
        this.vertices = new Float32Array(vertices);
        this.indices = new Uint16Array(indices);
        this.vertice_num = Math.floor(this.vertices.length / 3);

        this.normals = normals;

        this.center =  vec3.set(vec3.create(), 0, 0, 0);
    }

    get_vertices_reference(call_back) {
        for (let i = 0; i < this.vertice_num; i++) {
            const v = new Float32Array(this.vertices.buffer, i*3*Float32Array.BYTES_PER_ELEMENT, 3);
            call_back(v);
        }
    }

    set_vertices() {

    }

    get_vertices() {
        return this.vertices;
    }

    set_indices() {

    }

    get_indices() {
        return this.indices;
    }

    rotateX(rad) {
        const center = this.center;

        this.get_vertices_reference(function (v){
            vec3.rotateX(v, v, center, rad);
        });
    }

    rotateY(rad) {
        const center = this.center;

        this.get_vertices_reference(function (v){
            vec3.rotateY(v, v, center, rad);
        });
    }

    rotateZ(rad) {
        const center = this.center;

        this.get_vertices_reference(function (v){
            vec3.rotateZ(v, v, center, rad);
        });
    }

    translate(translation) {
        this.get_vertices_reference(function (v){
            vec3.add(v, v, translation);
        });
    }

}
