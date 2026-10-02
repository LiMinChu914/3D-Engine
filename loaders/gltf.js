import { logger } from "../core/Logger.js";

const log = logger.child("GltfLoader");
const COMPONENT_TYPES = {
    5120: Int8Array,
    5121: Uint8Array,
    5122: Int16Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array
};
const TYPE_SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

function readAccessor(gltf, buffers, accessorIndex) {
    const accessor = gltf.accessors[accessorIndex];
    const view = gltf.bufferViews[accessor.bufferView];
    const ArrayType = COMPONENT_TYPES[accessor.componentType];
    const itemSize = TYPE_SIZE[accessor.type];
    if (!ArrayType || !itemSize || accessor.sparse) {
        throw new Error("Unsupported glTF accessor format.");
    }
    const elementBytes = ArrayType.BYTES_PER_ELEMENT;
    const packedStride = itemSize * elementBytes;
    const stride = view.byteStride ?? packedStride;
    const byteOffset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const source = buffers[view.buffer];

    if (stride === packedStride) {
        return new ArrayType(source, byteOffset, accessor.count * itemSize).slice();
    }

    const result = new ArrayType(accessor.count * itemSize);
    const bytes = new Uint8Array(source);
    for (let i = 0; i < accessor.count; i += 1) {
        const item = new ArrayType(bytes.buffer, byteOffset + i * stride, itemSize);
        result.set(item, i * itemSize);
    }
    return result;
}

/** Load the geometry primitives from a glTF 2.0 JSON + external binary buffers. */
export async function loadGltf(url, { signal } = {}) {
    log.time(url);
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Could not load glTF (${response.status}): ${url}`);
    const gltf = await response.json();
    if (gltf.asset?.version !== "2.0") throw new Error(`Unsupported glTF version: ${gltf.asset?.version}`);

    const baseUrl = new URL(".", response.url);
    const buffers = await Promise.all((gltf.buffers ?? []).map(async (buffer) => {
        if (!buffer.uri || buffer.uri.startsWith("data:")) throw new Error("Only external glTF buffers are currently supported.");
        const bufferResponse = await fetch(new URL(buffer.uri, baseUrl), { signal });
        if (!bufferResponse.ok) throw new Error(`Could not load glTF buffer: ${buffer.uri}`);
        return bufferResponse.arrayBuffer();
    }));

    const primitives = [];
    for (const node of gltf.nodes ?? []) {
        if (node.mesh === undefined) continue;
        const mesh = gltf.meshes[node.mesh];
        for (const primitive of mesh.primitives) {
            if ((primitive.mode ?? 4) !== 4) continue;
            const positions = readAccessor(gltf, buffers, primitive.attributes.POSITION);
            const normals = primitive.attributes.NORMAL === undefined
                ? new Float32Array(positions.length)
                : readAccessor(gltf, buffers, primitive.attributes.NORMAL);
            const uvs = primitive.attributes.TEXCOORD_0 === undefined
                ? new Float32Array(positions.length / 3 * 2)
                : readAccessor(gltf, buffers, primitive.attributes.TEXCOORD_0);
            const rawIndices = primitive.indices === undefined
                ? Uint32Array.from({ length: positions.length / 3 }, (_, index) => index)
                : readAccessor(gltf, buffers, primitive.indices);
            const indices = positions.length / 3 > 65535
                ? new Uint32Array(rawIndices)
                : new Uint16Array(rawIndices);
            primitives.push({
                name: node.name ?? mesh.name ?? `primitive-${primitives.length}`,
                vertices: new Float32Array(positions),
                normals: new Float32Array(normals),
                uvs: new Float32Array(uvs),
                indices,
                node: {
                    translation: node.translation ?? [0, 0, 0],
                    rotation: node.rotation ?? [0, 0, 0, 1],
                    scale: node.scale ?? [1, 1, 1]
                },
                material: primitive.material ?? 0
            });
        }
    }
    log.timeEnd(url, { primitives: primitives.length });
    log.info("glTF loaded", { url, primitives: primitives.length });
    return { primitives, json: gltf };
}
