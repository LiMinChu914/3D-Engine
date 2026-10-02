/**
 * [NEW — COMPONENT ARCHITECTURE]
 * A lightweight container. Behaviour and data are supplied by attached components.
 */
export class Entity {
    static nextId = 1;

    constructor(name = "Entity") {
        // IDs are unique across entities created during this runtime.
        this.id = Entity.nextId++;
        this.name = name;
        this.active = true;
        this.components = new Map();
        this.world = null;
    }

    add(component) {
        if (!component || typeof component !== "object") {
            throw new TypeError("Entity.add() expects a component instance.");
        }
        const type = component.constructor;
        const previous = this.components.get(type);
        // Keep one component per concrete type, detaching any existing instance first.
        if (previous) this.remove(type);
        // A component can belong to only one entity at a time.
        if (component.entity && component.entity !== this) {
            component.entity.remove(type);
        }
        component.entity = this;
        this.components.set(type, component);
        component.onAttach?.(this);
        this.world?._indexComponent(this, type);
        return this;
    }

    remove(type) {
        const component = this.components.get(type);
        if (!component) return null;
        // Run lifecycle hooks before clearing ownership and world indexing.
        component.onDetach?.(this);
        component.entity = null;
        this.components.delete(type);
        this.world?._unindexComponent(this, type);
        return component;
    }

    get(type) {
        return this.components.get(type) ?? null;
    }

    has(type) {
        return this.components.has(type);
    }

    destroy() {
        // Unregister from the world, detach all components, then deactivate this entity.
        this.world?.remove(this);
        for (const type of [...this.components.keys()]) this.remove(type);
        this.active = false;
    }
}
