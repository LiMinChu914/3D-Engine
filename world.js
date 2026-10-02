import { Renderer } from "./Renderer/Renderer.js";
import { Transform } from "./components/Transform.js";
import { logger } from "./core/Logger.js";
import { mountLoggerPanel } from "./ui/LoggerPanel.js";
import { createWorldScene } from "./world/WorldScene.js";
import { FirstPersonController } from "./world/FirstPersonController.js";
import { WorldAnimation } from "./world/WorldAnimation.js";

// [MODIFIED — MATERIAL VARIANTS] One world entry selects procedural or CC0 atlases.
const $ = (selector) => document.querySelector(selector);
const canvas = $("#world-canvas");
const loading = $("#world-loading");
const log = logger.child("World");
const materialStyle = new URLSearchParams(location.search).get("material") === "textured"
    ? "textured"
    : "procedural";

let renderer;
let scene;
let controller;
let animation;
let previousTime = performance.now();
let frames = 0;
let fpsWindow = previousTime;

function updateHud(now) {
    frames += 1;
    if (now - fpsWindow < 500) return;
    $("#world-fps").textContent = Math.round(frames * 1000 / (now - fpsWindow));
    $("#draw-calls").textContent = renderer.stats.drawCalls;
    $("#culled-chunks").textContent = renderer.stats.culled;
    const position = scene.camera.get(Transform).position;
    $("#coordinates").textContent = `${position[0].toFixed(0)} / ${position[1].toFixed(0)} / ${position[2].toFixed(0)}`;
    $("#biome").textContent = scene.biomeAt(position[0], position[2]);
    $("#flight-height").textContent = `+${controller.verticalOffset.toFixed(1)} m`;
    frames = 0;
    fpsWindow = now;
}

function frame(now) {
    const delta = Math.min((now - previousTime) / 1000, 0.05);
    previousTime = now;
    controller.update(delta);
    animation.update(delta, controller.active);
    renderer.render(scene.world, scene.camera);
    updateHud(now);
    requestAnimationFrame(frame);
}

function bindInterface() {
    $("#enter-world").addEventListener("click", () => controller.activate(true));
    $("#world-canvas").addEventListener("dblclick", () => controller.activate(true));
    $("#world-wireframe").addEventListener("click", (event) => {
        renderer.wireframe = !renderer.wireframe;
        event.currentTarget.classList.toggle("active", renderer.wireframe);
        event.currentTarget.setAttribute("aria-pressed", String(renderer.wireframe));
    });
    $("#world-fullscreen").addEventListener("click", () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
    });
}

function configureMaterialInterface() {
    const textured = materialStyle === "textured";
    document.body.dataset.material = materialStyle;
    document.title = `${textured ? "寫實材質世界" : "程序方塊世界"} — Flux 3D`;
    $("#material-label").textContent = textured ? "CC0 TEXTURED" : "PROCEDURAL";
    $("#world-material").textContent = textured ? "POLY HAVEN" : "GENERATED";
    $("#world-kicker").textContent = textured ? "CC0 MATERIALS / 128 × 128" : "PROCEDURAL / 128 × 128";
    $("#world-title-accent").textContent = textured ? "材質世界。" : "方塊世界。";
    $("#world-description").textContent = textured
        ? "相同的山海、森林與聚落，換上草地、岩石、樹皮、磚牆和屋瓦的 CC0 實拍材質與法線貼圖。"
        : "山脈、海洋、森林和聚落由引擎即時生成。移動的太陽、距離霧與波動水面持續改變世界。";
    document.querySelectorAll("[data-material-style]").forEach((link) => {
        link.classList.toggle("active", link.dataset.materialStyle === materialStyle);
    });
}

async function startup() {
    mountLoggerPanel(logger);
    window.addEventListener("error", (event) => log.error("World runtime error", event.error ?? event.message));
    window.addEventListener("unhandledrejection", (event) => log.error("World promise rejected", event.reason));
    try {
        configureMaterialInterface();
        renderer = new Renderer(canvas, { pixelRatio: Math.min(devicePixelRatio, 1.5) });
        scene = await createWorldScene({
            materialStyle,
            onProgress(progress, label) {
                loading.querySelector("strong").textContent = label;
                loading.querySelector("i").style.transform = `scaleX(${progress})`;
            }
        });
        controller = new FirstPersonController(canvas, scene.camera, scene.heightAt, {
            onStateChange(active) {
                document.body.classList.toggle("exploring", active);
                $("#world-mode").textContent = active ? "EXPLORING" : "CINEMATIC";
            }
        });
        animation = new WorldAnimation(scene.world, scene.camera, scene.sun);
        $("#chunk-count").textContent = scene.stats.chunks;
        $("#world-vertices").textContent = scene.stats.vertices.toLocaleString("en-US");
        $("#world-objects").textContent = scene.stats.decorativeObjects.toLocaleString("en-US");
        bindInterface();
        loading.classList.add("done");
        log.info("Large world ready", scene.stats);
        // Draw the first frame immediately so the loading layer never reveals a blank canvas.
        previousTime = performance.now();
        frame(previousTime);
    } catch (error) {
        loading.querySelector("strong").textContent = "世界建立失敗";
        loading.querySelector("small").textContent = error.message;
        loading.classList.add("failed");
        log.error("Could not create world", error);
    }
}

startup();
