import { Geometry } from "../core/Geometry.js";

// [NEW — WORLD SCENE]
// Static batch builder: thousands of voxel-like surfaces become one Geometry per
// chunk. UV is emitted beside position/normal because it is a Geometry attribute.

export const TILE = Object.freeze({
    GRASS: 0,
    DIRT: 1,
    STONE: 2,
    SAND: 3,
    WOOD: 4,
    LEAVES: 5,
    BRICK: 6,
    ROOF: 7,
    WATER: 8,
    SNOW: 9,
    PATH: 10,
    WINDOW: 11
});

const ATLAS_COLUMNS = 4;
// WebGL 1 repeat + mipmaps require power-of-two texture dimensions.
const ATLAS_ROWS = 4;

function tileCoordinates(tile) {
    const inset = 0.006;
    const column = tile % ATLAS_COLUMNS;
    // Renderer flips DOM images during upload; atlas rows must mirror in UV space.
    const row = ATLAS_ROWS - 1 - Math.floor(tile / ATLAS_COLUMNS);
    const u0 = column / ATLAS_COLUMNS + inset;
    const u1 = (column + 1) / ATLAS_COLUMNS - inset;
    const v0 = row / ATLAS_ROWS + inset;
    const v1 = (row + 1) / ATLAS_ROWS - inset;
    return [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
}

export class MeshBuilder {
    constructor() {
        this.vertices = [];
        this.normals = [];
        this.uvs = [];
        this.indices = [];
    }

    addQuad(a, b, c, d, normal, tile) {
        const offset = this.vertices.length / 3;
        this.vertices.push(...a, ...b, ...c, ...d);
        for (let i = 0; i < 4; i += 1) this.normals.push(...normal);
        for (const uv of tileCoordinates(tile)) this.uvs.push(...uv);
        this.indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
        return this;
    }

    addTop(x, y, z, tile, size = 1) {
        return this.addQuad(
            [x, y, z], [x, y, z + size],
            [x + size, y, z + size], [x + size, y, z],
            [0, 1, 0], tile
        );
    }

    addBox(x, y, z, width, height, depth, tiles = TILE.BRICK) {
        const top = typeof tiles === "number" ? tiles : tiles.top;
        const side = typeof tiles === "number" ? tiles : tiles.side;
        const front = typeof tiles === "number" ? tiles : (tiles.front ?? side);
        const x1 = x + width, y1 = y + height, z1 = z + depth;
        this.addQuad([x, y1, z], [x, y1, z1], [x1, y1, z1], [x1, y1, z], [0, 1, 0], top);
        this.addQuad([x, y, z], [x1, y, z], [x1, y, z1], [x, y, z1], [0, -1, 0], side);
        this.addQuad([x, y, z], [x, y1, z], [x1, y1, z], [x1, y, z], [0, 0, -1], front);
        this.addQuad([x, y, z1], [x1, y, z1], [x1, y1, z1], [x, y1, z1], [0, 0, 1], side);
        this.addQuad([x, y, z], [x, y, z1], [x, y1, z1], [x, y1, z], [-1, 0, 0], side);
        this.addQuad([x1, y, z], [x1, y1, z], [x1, y1, z1], [x1, y, z1], [1, 0, 0], side);
        return this;
    }

    addTerrainSides(x, y, z, north, south, west, east, tile) {
        if (north < y) this.addQuad([x, north, z], [x, y, z], [x + 1, y, z], [x + 1, north, z], [0, 0, -1], tile);
        if (south < y) this.addQuad([x, south, z + 1], [x + 1, south, z + 1], [x + 1, y, z + 1], [x, y, z + 1], [0, 0, 1], tile);
        if (west < y) this.addQuad([x, west, z], [x, west, z + 1], [x, y, z + 1], [x, y, z], [-1, 0, 0], tile);
        if (east < y) this.addQuad([x + 1, east, z], [x + 1, y, z], [x + 1, y, z + 1], [x + 1, east, z + 1], [1, 0, 0], tile);
        return this;
    }

    toGeometry() {
        if (this.vertices.length / 3 > 65535) {
            throw new Error("Chunk exceeded the WebGL 1 Uint16 vertex limit. Reduce chunk size.");
        }
        return new Geometry(
            new Float32Array(this.vertices),
            new Uint16Array(this.indices),
            new Float32Array(this.normals),
            new Float32Array(this.uvs)
        );
    }
}

function patternColor(context, x, y, size, base, accent, kind) {
    context.fillStyle = base;
    context.fillRect(x, y, size, size);
    context.fillStyle = accent;
    if (kind === "grid") {
        context.fillRect(x, y + size * 0.46, size, 3);
        context.fillRect(x + size * 0.48, y, 3, size);
    } else if (kind === "stripes") {
        for (let i = 5; i < size; i += 11) context.fillRect(x, y + i, size, 3);
    } else if (kind === "leaves") {
        for (let i = 0; i < 22; i += 1) {
            const px = (i * 37 + i * i * 3) % (size - 8);
            const py = (i * 53 + i * 7) % (size - 8);
            context.fillRect(x + px, y + py, 7, 7);
        }
    } else {
        for (let i = 0; i < 34; i += 1) {
            const px = (i * 29 + i * i) % size;
            const py = (i * 47 + 11) % size;
            context.fillRect(x + px, y + py, 3, 3);
        }
    }
    context.strokeStyle = "rgba(0,0,0,.16)";
    context.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

export function createWorldAtlas() {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_COLUMNS * size;
    canvas.height = ATLAS_ROWS * size;
    const context = canvas.getContext("2d");
    const definitions = [
        ["#5e923e", "#7cad50", "speckle"], ["#755233", "#916a42", "speckle"],
        ["#6f7777", "#929999", "speckle"], ["#c6aa6b", "#ddc486", "speckle"],
        ["#705035", "#936c45", "stripes"], ["#285f36", "#3f8147", "leaves"],
        ["#844c3d", "#a86550", "grid"], ["#5e3540", "#814755", "stripes"],
        ["#2f83a8", "#58b4ca", "stripes"], ["#dce4dc", "#f3f5ee", "speckle"],
        ["#9b895e", "#b6a274", "grid"], ["#78bed0", "#d8f6fa", "grid"]
    ];
    definitions.forEach(([base, accent, kind], index) => {
        patternColor(context, (index % ATLAS_COLUMNS) * size, Math.floor(index / ATLAS_COLUMNS) * size, size, base, accent, kind);
    });
    return canvas;
}

export function createFlatNormalMap() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 4;
    const context = canvas.getContext("2d");
    context.fillStyle = "rgb(128, 128, 255)";
    context.fillRect(0, 0, 4, 4);
    return canvas;
}

// [NEW — TEXTURED WORLD] The geometry and UV layout stay identical; only the
// atlas source changes. Every source image is bundled locally and CC0.
const TEXTURED_TILE_ASSETS = [
    [TILE.GRASS, "leafy_grass"],
    [TILE.DIRT, "dirt"],
    [TILE.STONE, "rock_01"],
    [TILE.SAND, "sand_01"],
    [TILE.WOOD, "tree_bark_03"],
    [TILE.LEAVES, "leafy_grass"],
    [TILE.BRICK, "brick_4"],
    [TILE.ROOF, "roof_tiles"],
    [TILE.SNOW, "snow_01"],
    [TILE.PATH, "dirt"],
    [TILE.WINDOW, "wooden_planks"]
];

function createAtlasCanvas(fill = null) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    if (fill) {
        const context = canvas.getContext("2d");
        context.fillStyle = fill;
        context.fillRect(0, 0, canvas.width, canvas.height);
    }
    return canvas;
}

function loadAtlasImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.addEventListener("load", () => resolve(image), { once: true });
        image.addEventListener("error", () => reject(new Error(`Could not load world texture: ${url}`)), { once: true });
        image.src = url;
    });
}

function drawImageTile(context, image, tile) {
    const size = 128;
    const x = (tile % ATLAS_COLUMNS) * size;
    const y = Math.floor(tile / ATLAS_COLUMNS) * size;
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - sourceSize) * 0.5;
    const sy = (image.naturalHeight - sourceSize) * 0.5;
    context.drawImage(image, sx, sy, sourceSize, sourceSize, x, y, size, size);
}

function tintImageTile(context, tile, color) {
    const size = 128;
    context.save();
    context.globalCompositeOperation = "multiply";
    context.fillStyle = color;
    context.fillRect((tile % ATLAS_COLUMNS) * size, Math.floor(tile / ATLAS_COLUMNS) * size, size, size);
    context.restore();
}

export async function createTexturedAtlases(onProgress = () => {}) {
    const diffuse = createWorldAtlas();
    const normal = createAtlasCanvas("rgb(128, 128, 255)");
    const diffuseContext = diffuse.getContext("2d");
    const normalContext = normal.getContext("2d");
    const uniqueAssets = [...new Set(TEXTURED_TILE_ASSETS.map(([, asset]) => asset))];
    let loaded = 0;
    const images = new Map(await Promise.all(uniqueAssets.map(async (asset) => {
        const root = `./assets/polyhaven/world_textures/${asset}`;
        const [diffuseImage, normalImage] = await Promise.all([
            loadAtlasImage(`${root}_diff_1k.jpg`),
            loadAtlasImage(`${root}_nor_gl_1k.jpg`)
        ]);
        loaded += 1;
        onProgress(loaded / uniqueAssets.length, `正在載入寫實材質 ${loaded} / ${uniqueAssets.length}`);
        return [asset, { diffuseImage, normalImage }];
    })));

    for (const [tile, asset] of TEXTURED_TILE_ASSETS) {
        const pair = images.get(asset);
        drawImageTile(diffuseContext, pair.diffuseImage, tile);
        drawImageTile(normalContext, pair.normalImage, tile);
    }
    tintImageTile(diffuseContext, TILE.GRASS, "rgba(150, 205, 120, .32)");
    tintImageTile(diffuseContext, TILE.LEAVES, "rgba(58, 150, 70, .58)");
    return { diffuse, normal };
}
