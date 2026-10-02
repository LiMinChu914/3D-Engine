import { Component } from "./Component.js";

/** Update behaviour composed onto an Entity and executed by AnimationSystem. */
export class Animator extends Component {
    constructor(update, { playing = true } = {}) {
        super();
        if (typeof update !== "function") throw new TypeError("Animator requires an update function.");
        this.update = update;
        this.playing = playing;
        this.elapsed = 0;
    }
}
