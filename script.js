import { Geometry } from "./core/Geometry.js";
import { Material } from "./core/Material.js";
import { Entity } from "./core/Entity.js";
import { World } from "./scene/World.js";
import { Transform } from "./components/Transform.js";
import { MeshRenderer } from "./components/MeshRenderer.js";
import { CameraComponent } from "./components/Camera.js";
import { PointLight } from "./components/PointLight.js";
import { Renderer } from "./Renderer/Renderer.js";
import { loadObj } from "./read_obj.js";
import { logger } from "./core/Logger.js";
import { mountLoggerPanel } from "./ui/LoggerPanel.js";

// [MODIFIED — WORLD SCENE EXTRACTION]
// This entry now only owns the Apple / Camera object viewer. The large-world
// application and its animation live in world.js and world/WorldAnimation.js.

const MODEL_CONFIG = {
    apple: {
        object: "./apple/food_apple_01_4k.obj",
        color: "./apple/food_apple_01_diff_4k.jpg",
        normal: "./apple/food_apple_01_nor_gl_4k.jpg",
        scale: 8.2,
        position: [0, -0.35, 0],
        rotation: [0, -0.55, 0],
        shininess: 28
    },
    camera: {
        object: "./camera/Camera_01_4k.obj",
        color: "./camera/Camera_01_body_diff_4k.jpg",
        normal: "./camera/Camera_01_body_nor_gl_4k.jpg",
        scale: 3.4,
        position: [0.1, -0.13, -0.12],
        rotation: [-0.08, 0.35, 0],
        shininess: 42
    }
};

const log = logger.child("Showcase");
const $ = (selector) => document.querySelector(selector);
const canvas = $("#canvas");
const loading = $("#loading");
const fpsOutput = $("#fps");
const vertexOutput = $("#vertex-count");
const triangleOutput = $("#triangle-count");
const modelButtons = [...document.querySelectorAll("[data-model]")];

let renderer;
let currentEntity;
let currentModel = "apple";
let autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let dragging = false;
let previousPointer = [0, 0];
let frameCount = 0;
let fpsStartedAt = performance.now();
let lastFrame = performance.now();
let loadVersion = 0;
const modelCache = new Map();

const world = new World();
world.background = [0.035, 0.044, 0.039, 1];
world.fog.near = 1e5;
world.fog.far = 1e6;

const camera = new Entity("Main Camera")
    .add(new Transform({ position: [0, 0.08, 2.45] }))
    .add(new CameraComponent({ fov: 36, near: 0.01, far: 100, target: [0, 0, 0] }));
const light = new Entity("Key Light")
    .add(new Transform({ position: [1.6, 1.8, 2.2] }))
    .add(new PointLight({ color: [1, 0.96, 0.88] }));
world.add(camera, light);

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.addEventListener("load", () => resolve(image), { once: true });
        image.addEventListener("error", () => reject(new Error(`Could not load image: ${url}`)), { once: true });
        image.src = url;
    });
}

async function createModel(name) {
    if (modelCache.has(name)) return modelCache.get(name);
    const config = MODEL_CONFIG[name];
    const [model, color, normal] = await Promise.all([
        loadObj(config.object),
        loadImage(config.color),
        loadImage(config.normal)
    ]);

    // [MODIFIED — UV OWNERSHIP] Texture coordinates are constructed with Geometry.
    const geometry = new Geometry(model.vertices, model.indices, model.normals, model.uvs);
    const material = new Material(color, normal, { shininess: config.shininess });
    const entity = new Entity(name)
        .add(new Transform({
            position: config.position,
            rotation: config.rotation,
            scale: [config.scale, config.scale, config.scale]
        }))
        .add(new MeshRenderer(geometry, material));
    modelCache.set(name, entity);
    return entity;
}

async function selectModel(name) {
    if (name === currentModel && currentEntity) return;
    const version = ++loadVersion;
    loading.classList.remove("hidden");
    loading.querySelector("p").textContent = `正在載入 ${name.toUpperCase()} 模型`;
    modelButtons.forEach((button) => button.classList.toggle("selected", button.dataset.model === name));

    try {
        const entity = await createModel(name);
        if (version !== loadVersion) return;
        if (currentEntity) world.remove(currentEntity);
        currentEntity = entity;
        currentModel = name;
        entity.get(MeshRenderer).material.normalStrength = Number($("#normal-strength").value);
        world.add(entity);
        const renderable = entity.get(MeshRenderer);
        vertexOutput.textContent = renderable.geometry.vertice_num.toLocaleString("en-US");
        triangleOutput.textContent = (renderable.geometry.indices.length / 3).toLocaleString("en-US");
        camera.get(CameraComponent).lookAt([0, 0, 0]);
        camera.get(Transform).setPosition([0, 0.08, 2.45]);
        loading.classList.add("hidden");
        log.info("Object ready", { name, vertices: renderable.geometry.vertice_num });
    } catch (error) {
        loading.querySelector("p").textContent = "模型載入失敗";
        loading.querySelector("small").textContent = error.message;
        log.error("Object failed to load", error);
    }
}

function resetView() {
    const config = MODEL_CONFIG[currentModel];
    if (!currentEntity || !config) return;
    const transform = currentEntity.get(Transform);
    transform.setPosition(config.position);
    transform.setScale([config.scale, config.scale, config.scale]);
    transform.setRotation(config.rotation);
    camera.get(Transform).setPosition([0, 0.08, 2.45]);
}

function updateLight(degrees) {
    const angle = degrees * Math.PI / 180;
    light.get(Transform).setPosition([Math.sin(angle) * 2.4, 1.65, Math.cos(angle) * 2.4]);
}

function bindControls() {
    modelButtons.forEach((button) => button.addEventListener("click", () => selectModel(button.dataset.model)));
    $("#reset").addEventListener("click", resetView);
    $("#auto-rotate").checked = autoRotate;
    $("#auto-rotate").addEventListener("change", (event) => { autoRotate = event.target.checked; });
    $("#wireframe").addEventListener("change", (event) => { renderer.wireframe = event.target.checked; });

    const lightInput = $("#light-angle");
    lightInput.addEventListener("input", () => {
        $("#light-value").textContent = `${lightInput.value}°`;
        updateLight(Number(lightInput.value));
    });
    updateLight(Number(lightInput.value));

    const normalInput = $("#normal-strength");
    normalInput.addEventListener("input", () => {
        $("#normal-value").textContent = Number(normalInput.value).toFixed(1);
        if (currentEntity) currentEntity.get(MeshRenderer).material.normalStrength = Number(normalInput.value);
    });

    canvas.addEventListener("pointerdown", (event) => {
        dragging = true;
        previousPointer = [event.clientX, event.clientY];
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
        if (!dragging || !currentEntity) return;
        currentEntity.get(Transform).rotate(
            (event.clientY - previousPointer[1]) * 0.008,
            (event.clientX - previousPointer[0]) * 0.008,
            0
        );
        previousPointer = [event.clientX, event.clientY];
    });
    const stopDragging = () => { dragging = false; };
    canvas.addEventListener("pointerup", stopDragging);
    canvas.addEventListener("pointercancel", stopDragging);
    canvas.addEventListener("wheel", (event) => {
        event.preventDefault();
        const transform = camera.get(Transform);
        transform.setPosition([
            transform.position[0],
            transform.position[1],
            Math.max(1.25, Math.min(4.2, transform.position[2] + event.deltaY * 0.002))
        ]);
    }, { passive: false });

    $("#focus-viewer").addEventListener("click", () => {
        canvas.scrollIntoView({ behavior: "smooth", block: "center" });
        canvas.focus({ preventScroll: true });
    });
    $("#fullscreen").addEventListener("click", () => {
        const target = $(".viewport-shell");
        if (!document.fullscreenElement) target.requestFullscreen?.();
        else document.exitFullscreen?.();
    });
}

function animate(now) {
    const deltaSeconds = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    if (currentEntity && autoRotate && !dragging) currentEntity.get(Transform).rotate(0, deltaSeconds * 0.34, 0);
    renderer.render(world, camera);
    frameCount += 1;
    if (now - fpsStartedAt >= 500) {
        fpsOutput.textContent = `${Math.round(frameCount * 1000 / (now - fpsStartedAt))} FPS`;
        frameCount = 0;
        fpsStartedAt = now;
    }
    requestAnimationFrame(animate);
}

async function startup() {
    mountLoggerPanel(logger);
    window.addEventListener("error", (event) => log.error("Unhandled browser error", event.error ?? event.message));
    window.addEventListener("unhandledrejection", (event) => log.error("Unhandled promise rejection", event.reason));
    try {
        renderer = new Renderer(canvas);
        bindControls();
        const requested = new URLSearchParams(location.search).get("view");
        const initial = ["apple", "camera"].includes(requested) ? requested : "apple";
        await selectModel(initial);
        requestAnimationFrame(animate);
        window.setTimeout(() => createModel(initial === "apple" ? "camera" : "apple").catch(() => {}), 900);
    } catch (error) {
        loading.querySelector("p").textContent = "無法啟動 WebGL";
        loading.querySelector("small").textContent = error.message;
        log.error("Application startup failed", error);
    }
}

startup();
