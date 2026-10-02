// [MODIFIED FROM ORIGINAL] Replaced blocking XMLHttpRequest with an asynchronous fetch pipeline.
import { logger } from "./core/Logger.js";

const log = logger.child("ObjLoader");

/** Parse the subset of Wavefront OBJ needed by the engine. */
export function parseObj(source) {
    const positions = [];
    const texcoords = [];
    const sourceNormals = [];
    const vertexMap = new Map();
    const packed = [];
    const indices = [];

    const resolveIndex = (value, count) => {
        const index = Number.parseInt(value, 10);
        return index < 0 ? count + index : index - 1;
    };

    const addVertex = (reference) => {
        if (vertexMap.has(reference)) return vertexMap.get(reference);
        const [positionRef, uvRef, normalRef] = reference.split("/");
        const positionIndex = resolveIndex(positionRef, positions.length / 3) * 3;
        const uvIndex = uvRef ? resolveIndex(uvRef, texcoords.length / 2) * 2 : -1;
        const normalIndex = normalRef ? resolveIndex(normalRef, sourceNormals.length / 3) * 3 : -1;
        const index = packed.length;
        packed.push({ positionIndex, uvIndex, normalIndex });
        vertexMap.set(reference, index);
        return index;
    };

    for (const rawLine of source.split(/\r?\n/)) {
        const line = rawLine.split("#", 1)[0].trim();
        if (!line) continue;
        const [keyword, ...values] = line.split(/\s+/);
        if (keyword === "v") positions.push(...values.slice(0, 3).map(Number));
        else if (keyword === "vt") texcoords.push(...values.slice(0, 2).map(Number));
        else if (keyword === "vn") sourceNormals.push(...values.slice(0, 3).map(Number));
        else if (keyword === "f") {
            const face = values.map(addVertex);
            for (let i = 1; i < face.length - 1; i += 1) {
                indices.push(face[0], face[i], face[i + 1]);
            }
        }
    }

    const vertices = new Float32Array(packed.length * 3);
    const uvs = new Float32Array(packed.length * 2);
    const normals = new Float32Array(packed.length * 3);
    packed.forEach(({ positionIndex, uvIndex, normalIndex }, index) => {
        vertices.set(positions.slice(positionIndex, positionIndex + 3), index * 3);
        if (uvIndex >= 0) uvs.set(texcoords.slice(uvIndex, uvIndex + 2), index * 2);
        if (normalIndex >= 0) normals.set(sourceNormals.slice(normalIndex, normalIndex + 3), index * 3);
    });

    return {
        vertices,
        uvs,
        normals,
        indices: packed.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices)
    };
}

export async function loadObj(url, { signal } = {}) {
    log.time(url);
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Could not load OBJ (${response.status}): ${url}`);
    const result = parseObj(await response.text());
    log.timeEnd(url, { vertices: result.vertices.length / 3, triangles: result.indices.length / 3 });
    log.info("OBJ loaded", { url, vertices: result.vertices.length / 3 });
    return result;
}

/** @deprecated Use loadObj. */
export function readObj() {
    throw new Error("readObj() was synchronous. Use await loadObj(url) instead.");
}
