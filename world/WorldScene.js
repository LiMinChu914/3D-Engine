import { Entity } from "../core/Entity.js";
import { Material } from "../core/Material.js";
import { World } from "../scene/World.js";
import { Transform } from "../components/Transform.js";
import { MeshRenderer } from "../components/MeshRenderer.js";
import { CameraComponent } from "../components/Camera.js";
import { PointLight } from "../components/PointLight.js";
import { MeshBuilder, TILE, createFlatNormalMap, createTexturedAtlases, createWorldAtlas } from "./ProceduralGeometry.js";

// [NEW — WORLD SCENE] Procedural, chunked Minecraft-like world assembly.
export const WORLD_SIZE = 128;
export const CHUNK_SIZE = 16;
export const SEA_LEVEL = 3;

const BUILDINGS = [
    { x: -11, z: 2, w: 7, d: 6, h: 5 },
    { x: -1, z: -7, w: 6, d: 7, h: 6 },
    { x: 8, z: 2, w: 8, d: 6, h: 5 },
    { x: -13, z: -12, w: 6, d: 5, h: 4 },
    { x: 5, z: 14, w: 6, d: 6, h: 7 },
    { x: 18, z: 10, w: 7, d: 5, h: 5 },
    { x: -25, z: 16, w: 9, d: 7, h: 6 }
];

function hash2(x, z) {
    const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
    return value - Math.floor(value);
}

function smooth(value) { return value * value * (3 - 2 * value); }

function valueNoise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = smooth(x - ix), fz = smooth(z - iz);
    const a = hash2(ix, iz), b = hash2(ix + 1, iz);
    const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
    const top = a + (b - a) * fx;
    const bottom = c + (d - c) * fx;
    return (top + (bottom - top) * fz) * 2 - 1;
}

function fbm(x, z, octaves = 5) {
    let value = 0, amplitude = 0.5, frequency = 1, total = 0;
    for (let i = 0; i < octaves; i += 1) {
        value += valueNoise(x * frequency, z * frequency) * amplitude;
        total += amplitude;
        amplitude *= 0.5;
        frequency *= 2.03;
    }
    return value / total;
}

export function heightAt(x, z) {
    const continental = fbm(x * 0.019 + 4.3, z * 0.019 - 2.8);
    const detail = fbm(x * 0.065 - 9.1, z * 0.065 + 7.7, 3);
    const ridgeNoise = 1 - Math.abs(fbm(x * 0.026 + 18, z * 0.026 - 13, 4));
    const ridge = Math.pow(Math.max(0, ridgeNoise - 0.35) / 0.65, 2.3) * 13;
    const mountain = Math.exp(-((x - 30) ** 2 + (z + 27) ** 2) / 680) * 15;
    const edge = Math.hypot(x, z) / (WORLD_SIZE * 0.5);
    const islandFalloff = Math.max(0, edge - 0.7) * 34;
    return Math.max(-3, Math.floor(5 + continental * 6 + detail * 2 + ridge + mountain - islandFalloff));
}

function topTile(height) {
    if (height <= SEA_LEVEL + 1) return TILE.SAND;
    if (height >= 22) return TILE.SNOW;
    if (height >= 16) return TILE.STONE;
    return TILE.GRASS;
}

export function biomeAt(x, z) {
    const height = heightAt(x, z);
    if (height < SEA_LEVEL) return "海洋";
    if (height <= SEA_LEVEL + 1) return "海岸";
    if (height >= 22) return "雪峰";
    if (height >= 16) return "山地";
    if (fbm(x * 0.045 + 2, z * 0.045 - 8, 3) > 0.04) return "森林";
    return "草原";
}

function overlapsVillage(x, z, padding = 3) {
    return BUILDINGS.some((building) => x >= building.x - padding
        && x <= building.x + building.w + padding
        && z >= building.z - padding
        && z <= building.z + building.d + padding);
}

function addTree(builder, x, y, z, variant) {
    const trunkHeight = 3 + (variant % 3);
    builder.addBox(x + 0.35, y, z + 0.35, 0.3, trunkHeight, 0.3, TILE.WOOD);
    const crown = 1.7 + (variant % 2) * 0.35;
    builder.addBox(x - crown * 0.5 + 0.5, y + trunkHeight - 0.7, z - crown * 0.5 + 0.5, crown, 2.1, crown, TILE.LEAVES);
}

function addBuilding(builder, building) {
    const base = Math.max(SEA_LEVEL + 1, heightAt(building.x + building.w * 0.5, building.z + building.d * 0.5));
    builder.addBox(building.x, base, building.z, building.w, building.h, building.d, {
        top: TILE.ROOF, side: TILE.BRICK, front: TILE.WINDOW
    });
    builder.addBox(building.x - 0.45, base + building.h, building.z - 0.45,
        building.w + 0.9, 1.2, building.d + 0.9, TILE.ROOF);
    builder.addBox(building.x + building.w * 0.42, base, building.z - 0.08, 1.15, 2.5, 0.12, TILE.WOOD);
    return base;
}

function buildingInChunk(building, startX, startZ) {
    return building.x >= startX && building.x < startX + CHUNK_SIZE
        && building.z >= startZ && building.z < startZ + CHUNK_SIZE;
}

function createChunk(startX, startZ) {
    const builder = new MeshBuilder();
    let decorativeObjects = 0;
    for (let z = startZ; z < startZ + CHUNK_SIZE; z += 1) {
        for (let x = startX; x < startX + CHUNK_SIZE; x += 1) {
            const height = heightAt(x, z);
            builder.addTop(x, height, z, topTile(height));
            builder.addTerrainSides(
                x, height, z,
                heightAt(x, z - 1), heightAt(x, z + 1),
                heightAt(x - 1, z), heightAt(x + 1, z),
                height >= 16 ? TILE.STONE : TILE.DIRT
            );

            const forest = fbm(x * 0.045 + 2, z * 0.045 - 8, 3);
            const treeChance = hash2(x * 3.1, z * 4.7);
            if (height > SEA_LEVEL + 1 && height < 17 && forest > 0.04
                && treeChance > 0.955 && !overlapsVillage(x, z)) {
                addTree(builder, x, height, z, Math.floor(treeChance * 100));
                decorativeObjects += 1;
            }
        }
    }

    for (const building of BUILDINGS.filter((item) => buildingInChunk(item, startX, startZ))) {
        addBuilding(builder, building);
        decorativeObjects += 1;
    }
    return { geometry: builder.toGeometry(), decorativeObjects };
}

function createOceanGeometry() {
    const builder = new MeshBuilder();
    const half = WORLD_SIZE * 0.58;
    const step = 4;
    for (let z = -half; z < half; z += step) {
        for (let x = -half; x < half; x += step) builder.addTop(x, SEA_LEVEL + 0.16, z, TILE.WATER, step);
    }
    return builder.toGeometry();
}

function findSpawn() {
    let best = { x: 0, z: 24, height: heightAt(0, 24) };
    for (let radius = 8; radius <= 36; radius += 4) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const x = Math.round(Math.cos(angle) * radius);
            const z = Math.round(Math.sin(angle) * radius);
            const height = heightAt(x, z);
            if (height > SEA_LEVEL + 1 && height < 15 && !overlapsVillage(x, z, 1)) return { x, z, height };
            if (height > best.height && height < 18) best = { x, z, height };
        }
    }
    return best;
}

export async function createWorldScene({ onProgress = () => {}, materialStyle = "procedural" } = {}) {
    const world = new World();
    world.background = [0.45, 0.69, 0.83, 1];
    world.fog = { color: new Float32Array([0.45, 0.69, 0.83]), near: 78, far: 155 };

    // [NEW — TEXTURED WORLD] Both styles reuse identical height/chunk geometry.
    const textured = materialStyle === "textured";
    const atlases = textured
        ? await createTexturedAtlases((progress, label) => onProgress(progress * 0.12, label))
        : { diffuse: createWorldAtlas(), normal: createFlatNormalMap() };
    const atlas = atlases.diffuse;
    const normal = atlases.normal;
    const landMaterial = new Material(atlas, normal, {
        shininess: textured ? 18 : 7,
        normalStrength: textured ? 0.82 : 0
    });
    const waterMaterial = new Material(atlas, normal, {
        color: [0.68, 0.9, 1, 1], shininess: 72, normalStrength: 0,
        waveStrength: 0.2, waveScale: 0.18, waveSpeed: 1.35
    });

    const start = -WORLD_SIZE / 2;
    const chunksPerSide = WORLD_SIZE / CHUNK_SIZE;
    const totalChunks = chunksPerSide * chunksPerSide;
    let completed = 0, vertices = 0, triangles = 0, decorativeObjects = 0;

    // [NEW — STATIC BATCHING] One renderable per chunk, not one Entity per block/tree.
    for (let cz = 0; cz < chunksPerSide; cz += 1) {
        for (let cx = 0; cx < chunksPerSide; cx += 1) {
            const chunk = createChunk(start + cx * CHUNK_SIZE, start + cz * CHUNK_SIZE);
            const entity = new Entity(`Terrain ${cx}:${cz}`)
                .add(new Transform())
                .add(new MeshRenderer(chunk.geometry, landMaterial));
            world.add(entity);
            vertices += chunk.geometry.vertice_num;
            triangles += chunk.geometry.indices.length / 3;
            decorativeObjects += chunk.decorativeObjects;
            completed += 1;
            const chunkProgress = completed / totalChunks;
            onProgress(textured ? 0.12 + chunkProgress * 0.88 : chunkProgress,
                `正在建立區塊 ${completed} / ${totalChunks}`);
        }
    }

    const oceanGeometry = createOceanGeometry();
    const oceanRenderer = new MeshRenderer(oceanGeometry, waterMaterial);
    oceanRenderer.frustumCulled = false;
    world.add(new Entity("Animated Ocean").add(new Transform()).add(oceanRenderer));
    vertices += oceanGeometry.vertice_num;
    triangles += oceanGeometry.indices.length / 3;

    const spawn = findSpawn();
    const camera = new Entity("Explorer Camera")
        .add(new Transform({ position: [spawn.x, spawn.height + 2.1, spawn.z] }))
        .add(new CameraComponent({ fov: 68, near: 0.08, far: 210, target: [0, 8, 0] }));
    const sun = new Entity("Animated Sun")
        .add(new Transform({ position: [55, 72, 35] }))
        .add(new PointLight({ color: [1, 0.91, 0.73], intensity: 1.3 }));
    world.add(camera, sun);

    return {
        world, camera, sun, spawn,
        heightAt, biomeAt,
        stats: {
            chunks: totalChunks, vertices, triangles, decorativeObjects,
            buildings: BUILDINGS.length, materialStyle
        }
    };
}
