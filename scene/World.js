import { Transform } from "../components/Transform.js";

/** [NEW — COMPONENT ARCHITECTURE] Entity registry and component query boundary. */
export class World {
    constructor() {
        this.isComponentWorld = true;
        this.entities = new Set();
        this.componentIndex = new Map();
        this.background = [0.025, 0.03, 0.035, 1];
        // [MODIFIED — LARGE WORLD] Renderer consumes this optional distance-fog setup.
        this.fog = { color: new Float32Array([0.6, 0.75, 0.8]), near: 50, far: 180 };
    }

    add(...entities) {
        for (const entity of entities) {
            if (!entity || this.entities.has(entity)) continue;
            entity.world?.remove(entity);
            entity.world = this;
            this.entities.add(entity);
            for (const type of entity.components.keys()) this._indexComponent(entity, type);
        }
        return this;
    }

    remove(entity) {
        if (!this.entities.delete(entity)) return this;
        for (const type of entity.components.keys()) this._unindexComponent(entity, type);
        entity.world = null;
        return this;
    }

    _indexComponent(entity, type) {
        if (!this.componentIndex.has(type)) this.componentIndex.set(type, new Set());
        this.componentIndex.get(type).add(entity);
    }

    _unindexComponent(entity, type) {
        const entities = this.componentIndex.get(type);
        entities?.delete(entity);
        if (entities?.size === 0) this.componentIndex.delete(type);
    }

    query(...types) {
        if (types.length === 0) return [...this.entities].filter((entity) => entity.active);
        const candidates = this.componentIndex.get(types[0]) ?? [];
        return [...candidates].filter((entity) => entity.active && types.every((type) => entity.has(type)));
    }

    updateTransforms() {
        for (const entity of this.query(Transform)) {
            const transform = entity.get(Transform);
            transform.updateWorldMatrix();
        }
    }
}
