import { Component } from "./Component.js";
import { Transform } from "./Transform.js";

/** [NEW] Point-light data is an attachable component, not a special Scene field. */
export class PointLight extends Component {
    constructor({ color = [1, 0.96, 0.88], intensity = 1 } = {}) {
        super();
        this.color = new Float32Array(color);
        this.intensity = intensity;
        this.renderColor = new Float32Array(3);
    }

    onAttach(entity) {
        if (!entity.has(Transform)) entity.add(new Transform());
    }

    getRenderColor() {
        for (let i = 0; i < 3; i += 1) this.renderColor[i] = this.color[i] * this.intensity;
        return this.renderColor;
    }
}
