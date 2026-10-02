import { Animator } from "../components/Animator.js";
import { Transform } from "../components/Transform.js";

/** Runs animation components without coupling animation logic to Renderer. */
export class AnimationSystem {
    constructor() {
        this.enabled = true;
    }

    update(world, deltaSeconds) {
        if (!this.enabled) return;
        for (const entity of world.query(Animator, Transform)) {
            const animator = entity.get(Animator);
            if (!animator.enabled || !animator.playing) continue;
            animator.elapsed += deltaSeconds;
            animator.update(entity, entity.get(Transform), animator.elapsed, deltaSeconds);
        }
    }
}
