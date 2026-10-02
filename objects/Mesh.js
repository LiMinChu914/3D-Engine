import { Object3D } from "../core/Object3D.js";
import { computeTangents } from "../core/computeTangents.js";





export class Mesh extends Object3D{
    constructor(geometry, material) {
        super();
        this.geometry = geometry;
        this.material = material;

        // [MODIFIED] Legacy Mesh now shares the component pipeline's geometry utility.
        this.normalMapTangent = computeTangents(
            geometry.vertices,
            geometry.uvs?.length ? geometry.uvs : material.uvs_per_vertex,
            geometry.indices
        );
    }
}
