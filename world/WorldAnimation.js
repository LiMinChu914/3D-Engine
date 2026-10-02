import { Transform } from "../components/Transform.js";
import { CameraComponent } from "../components/Camera.js";
import { PointLight } from "../components/PointLight.js";

// [NEW — WORLD SCENE]
// All world animation lives here rather than inflating script.js: cinematic camera,
// moving sun, day-color drift. Water motion is fed by Renderer time uniforms.
export class WorldAnimation {
    constructor(world, cameraEntity, sunEntity) {
        this.world = world;
        this.cameraTransform = cameraEntity.get(Transform);
        this.camera = cameraEntity.get(CameraComponent);
        this.sunTransform = sunEntity.get(Transform);
        this.sun = sunEntity.get(PointLight);
        this.elapsed = 0;
    }

    update(delta, isExploring) {
        this.elapsed += delta;
        const dayAngle = this.elapsed * 0.025 + 0.75;
        this.sunTransform.setPosition([
            Math.cos(dayAngle) * 82,
            55 + Math.sin(dayAngle) * 24,
            Math.sin(dayAngle) * 82
        ]);

        const warmth = 0.5 + Math.sin(dayAngle) * 0.5;
        this.sun.color[0] = 1;
        this.sun.color[1] = 0.78 + warmth * 0.18;
        this.sun.color[2] = 0.62 + warmth * 0.25;
        this.sun.intensity = 1.05 + warmth * 0.35;

        const sky = [0.34 + warmth * 0.14, 0.53 + warmth * 0.18, 0.68 + warmth * 0.16];
        this.world.background[0] = sky[0];
        this.world.background[1] = sky[1];
        this.world.background[2] = sky[2];
        this.world.fog.color.set(sky);

        if (!isExploring) {
            const angle = this.elapsed * 0.045 + 0.7;
            const radius = 51 + Math.sin(this.elapsed * 0.08) * 6;
            this.cameraTransform.setPosition([
                Math.cos(angle) * radius,
                25 + Math.sin(this.elapsed * 0.12) * 5,
                Math.sin(angle) * radius
            ]);
            this.camera.lookAt([0, 7, 0]);
        }
    }
}
