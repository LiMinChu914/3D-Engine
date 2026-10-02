import { Transform } from "../components/Transform.js";
import { CameraComponent } from "../components/Camera.js";

// [MODIFIED — 3D FLIGHT] Added vertical movement while retaining terrain following.
export class FirstPersonController {
    constructor(canvas, cameraEntity, heightAt, { worldRadius = 61, onStateChange = () => {} } = {}) {
        this.canvas = canvas;
        this.transform = cameraEntity.get(Transform);
        this.camera = cameraEntity.get(CameraComponent);
        this.heightAt = heightAt;
        this.worldRadius = worldRadius;
        this.onStateChange = onStateChange;
        this.keys = new Set();
        this.active = false;
        this.yaw = Math.PI * 1.08;
        this.pitch = -0.14;
        this.speed = 9;
        this.verticalSpeed = 7;
        this.verticalOffset = 0;
        this.maxVerticalOffset = 48;
        this.eyeHeight = 1.8;
        this.spawnPosition = [...this.transform.position];
        this.touchLook = null;
        this.mobileMove = new Set();
        this.bindEvents();
        this.updateTarget();
    }

    bindEvents() {
        window.addEventListener("keydown", (event) => {
            if ([
                "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
                "Space", "KeyE", "KeyQ", "ShiftLeft", "ShiftRight"
            ].includes(event.code)) {
                event.preventDefault();
                this.keys.add(event.code);
                this.activate(false);
            }
        });
        window.addEventListener("keyup", (event) => this.keys.delete(event.code));
        document.addEventListener("pointerlockchange", () => {
            if (document.pointerLockElement === this.canvas) this.activate(false);
        });
        document.addEventListener("mousemove", (event) => {
            if (document.pointerLockElement !== this.canvas) return;
            this.look(event.movementX, event.movementY);
        });
        this.canvas.addEventListener("click", () => {
            if (this.active && matchMedia("(pointer: fine)").matches) this.canvas.requestPointerLock?.();
        });
        this.canvas.addEventListener("touchstart", (event) => {
            const touch = event.touches[0];
            this.touchLook = [touch.clientX, touch.clientY];
            this.activate(false);
        }, { passive: true });
        this.canvas.addEventListener("touchmove", (event) => {
            if (!this.touchLook) return;
            const touch = event.touches[0];
            this.look(touch.clientX - this.touchLook[0], touch.clientY - this.touchLook[1]);
            this.touchLook = [touch.clientX, touch.clientY];
        }, { passive: true });
        this.canvas.addEventListener("touchend", () => { this.touchLook = null; }, { passive: true });

        for (const button of document.querySelectorAll("[data-move]")) {
            const direction = button.dataset.move;
            const start = (event) => {
                event.preventDefault();
                this.mobileMove.add(direction);
                this.activate(false);
            };
            const stop = () => this.mobileMove.delete(direction);
            button.addEventListener("pointerdown", start);
            button.addEventListener("pointerup", stop);
            button.addEventListener("pointercancel", stop);
            button.addEventListener("pointerleave", stop);
        }
    }

    activate(lockPointer = true) {
        if (!this.active) {
            this.active = true;
            this.verticalOffset = 0;
            // Cinematic mode moves this same camera; entering restores the safe land spawn.
            this.transform.setPosition(this.spawnPosition);
            this.updateTarget();
            this.onStateChange(true);
        }
        if (lockPointer && matchMedia("(pointer: fine)").matches) this.canvas.requestPointerLock?.();
    }

    look(dx, dy) {
        this.yaw -= dx * 0.0025;
        this.pitch = Math.max(-1.25, Math.min(1.25, this.pitch - dy * 0.0022));
        this.updateTarget();
    }

    update(delta) {
        if (!this.active) return;
        const forward = Number(this.keys.has("KeyW") || this.keys.has("ArrowUp") || this.mobileMove.has("forward"))
            - Number(this.keys.has("KeyS") || this.keys.has("ArrowDown") || this.mobileMove.has("back"));
        const strafe = Number(this.keys.has("KeyD") || this.keys.has("ArrowRight") || this.mobileMove.has("right"))
            - Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft") || this.mobileMove.has("left"));
        const vertical = Number(this.keys.has("Space") || this.keys.has("KeyE") || this.mobileMove.has("up"))
            - Number(this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")
                || this.keys.has("KeyQ") || this.mobileMove.has("down"));
        if (vertical) {
            this.verticalOffset = Math.max(0, Math.min(
                this.maxVerticalOffset,
                this.verticalOffset + vertical * this.verticalSpeed * delta
            ));
        }
        if (forward || strafe || vertical) {
            const length = Math.hypot(forward, strafe) || 1;
            const distance = this.speed * delta / length;
            const dx = (Math.sin(this.yaw) * forward + Math.cos(this.yaw) * strafe) * distance;
            const dz = (Math.cos(this.yaw) * forward - Math.sin(this.yaw) * strafe) * distance;
            const x = Math.max(-this.worldRadius, Math.min(this.worldRadius, this.transform.position[0] + dx));
            const z = Math.max(-this.worldRadius, Math.min(this.worldRadius, this.transform.position[2] + dz));
            const ground = Math.max(this.heightAt(x, z), 3.15);
            this.transform.setPosition([x, ground + this.eyeHeight + this.verticalOffset, z]);
        }
        this.updateTarget();
    }

    updateTarget() {
        const position = this.transform.position;
        const cosPitch = Math.cos(this.pitch);
        this.camera.lookAt([
            position[0] + Math.sin(this.yaw) * cosPitch,
            position[1] + Math.sin(this.pitch),
            position[2] + Math.cos(this.yaw) * cosPitch
        ]);
    }
}
