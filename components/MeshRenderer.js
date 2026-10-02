import { Component } from "./Component.js";
import { computeTangents } from "../core/computeTangents.js";

/** [NEW] Renderable data component; spatial data lives in a separate Transform. */
export class MeshRenderer extends Component {
    constructor(geometry, material, shared = null) {
        super();
        this.geometry = geometry;
        this.material = material;
        const uvs = geometry.uvs?.length ? geometry.uvs : material.uvs_per_vertex;
        this.tangents = shared?.tangents
            ?? computeTangents(geometry.vertices, uvs, geometry.indices);
        this.resourceKey = shared?.resourceKey ?? this;
        this.frustumCulled = true; // [MODIFIED — LARGE WORLD] Per-renderable culling opt-out.
        this.castShadow = true;
        this.receiveShadow = true;
    }

    clone() {
        const clone = new MeshRenderer(this.geometry, this.material, {
            tangents: this.tangents,
            resourceKey: this.resourceKey
        });
        clone.frustumCulled = this.frustumCulled;
        return clone;
    }
}
