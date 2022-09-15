import { vec3, vec4, mat3, mat4 } from "../lib/glMatrix/src/index.js";
import { Geometry } from "../core/Geometry.js";
import { Object3D } from "../core/Object3D.js";





export class Mesh extends Object3D{
    constructor(geometry, material) {
        super();
        this.geometry = geometry;
        this.material = material;

        //this.normalMapTangent = this.computeTangentBitangent(this.geometry.vertices, this.material.uvs_per_vertex, this.geometry.indices).tangents;
        this.normalMapTangent = this.computeTangentBasis(this.geometry.vertices, this.material.uvs_per_vertex);
    
    }

    computeTangentBitangent(vertices, uvs, indices) {
        const tangents = new Float32Array(vertices.length);
        const bitangents = new Float32Array(vertices.length);
        for (let i = 0; i < indices.length; i += 3) {
            const i1 = indices[i] * Float32Array.BYTES_PER_ELEMENT;
            const i2 = indices[i + 1] * Float32Array.BYTES_PER_ELEMENT;
            const i3 = indices[i + 2] * Float32Array.BYTES_PER_ELEMENT;
            const i1_3 = 3 * i1, i2_3 = 3 * i2, i3_3 = 3 * i3;
    
            const t0 = new Float32Array(tangents.buffer, i1_3, 3);
            const t1 = new Float32Array(tangents.buffer, i2_3, 3);
            const t2 = new Float32Array(tangents.buffer, i3_3, 3);
    
            const b0 = new Float32Array(bitangents.buffer, i1_3, 3);
            const b1 = new Float32Array(bitangents.buffer, i2_3, 3);
            const b2 = new Float32Array(bitangents.buffer, i3_3, 3);
    
            const v0 = new Float32Array(vertices.buffer, i1_3, 3);
            const v1 = new Float32Array(vertices.buffer, i2_3, 3);
            const v2 = new Float32Array(vertices.buffer, i3_3, 3);
    
            const uv0 = new Float32Array(uvs.buffer, 2 * i1, 2);
            const uv1 = new Float32Array(uvs.buffer, 2 * i2, 2);
            const uv2 = new Float32Array(uvs.buffer, 2 * i3, 2);
    
            const edge1 = vec3.subtract(vec3.create(), v1, v0);
            const edge2 = vec3.subtract(vec3.create(), v2, v0);
    
            const delta_u1 = uv1[0] - uv0[0];
            const delta_v1 = uv1[1] - uv0[1];
            const delta_u2 = uv2[0] - uv0[0];
            const delta_v2 = uv2[1] - uv0[1];
    
            const f = 1.0 / (delta_u1 * delta_v1 - delta_u2 * delta_v2);
            const tangent = vec3.fromValues(
                f * (delta_v2 * edge1[0] - delta_v1 * edge2[0]),
                f * (delta_v2 * edge1[1] - delta_v1 * edge2[1]),
                f * (delta_v2 * edge1[2] - delta_v1 * edge2[2])
            );
            const bitangent = vec3.fromValues(
                f * (-delta_u2 * edge1[0] - delta_u1 * edge2[0]),
                f * (-delta_u2 * edge1[1] - delta_u1 * edge2[1]),
                f * (-delta_u2 * edge1[2] - delta_u1 * edge2[2])
            );
    
            vec3.add(t0, t0, tangent);
            vec3.add(t1, t1, tangent);
            vec3.add(t2, t2, tangent);
    
            vec3.add(b0, b0, bitangent);
            vec3.add(b1, b1, bitangent);
            vec3.add(b2, b2, bitangent);
        }

        for(let i = 0; i < vertices.length; i++){
            console.log(tangents[i]);
        }

        return {
            tangents: tangents,
            bitangents: bitangents
        };
    }

    
    computeTangentBasis(vertices, uvs) {
        const tangents = [];

        const num = Math.floor(vertices.length / 3);
        for (let i = 0; i < num; i += 3) {
            const v0 = new Float32Array(vertices.buffer, 3 * i * Float32Array.BYTES_PER_ELEMENT, 3);
            const v1 = new Float32Array(vertices.buffer, (3 * ((i + 1) % num)) * Float32Array.BYTES_PER_ELEMENT, 3);
            const v2 = new Float32Array(vertices.buffer, (3 * ((i + 2) % num)) * Float32Array.BYTES_PER_ELEMENT, 3);

            const uv0 = new Float32Array(uvs.buffer, 2 * i * Float32Array.BYTES_PER_ELEMENT, 2);
            const uv1 = new Float32Array(uvs.buffer, (2 * ((i + 1) % num)) * Float32Array.BYTES_PER_ELEMENT, 2);
            const uv2 = new Float32Array(uvs.buffer, (2 * ((i + 2) % num)) * Float32Array.BYTES_PER_ELEMENT, 2);

            const E1 = vec3.sub(vec3.create(), v1, v0);
            const E2 = vec3.sub(vec3.create(), v2, v0);
            const delta_u1 = uv1[0] - uv0[0];
            const delta_v1 = uv1[1] - uv0[1];
            const delta_u2 = uv2[0] - uv0[0];
            const delta_v2 = uv2[1] - uv0[1];

            const r = 1.0 / (delta_u1 * delta_v2 - delta_u2 * delta_v1);

            const tangent =
                vec3.set(
                    vec3.create(),
                    r * (delta_v2 * E1[0] - delta_v1 * E2[0]),
                    r * (delta_v2 * E1[1] - delta_v1 * E2[1]),
                    r * (delta_v2 * E1[2] - delta_v1 * E2[2])
                );

            vec3.normalize(tangent, tangent);

            tangents.push(tangent);
            //tangents.push(tangent);
            //tangents.push(tangent);
        }

        //for(let i = 0; i < tangents.length; i++){
        //    console.log(tangents[i]);
        //}

        return tangents
    }

}

