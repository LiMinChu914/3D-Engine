// [MODIFIED] UV data was removed from Material and moved to Geometry.
export class Material {
    constructor(texture, normalMap, optionsOrLegacyUvs = {}, legacyOptions = {}) {
        const usingLegacyUvs = ArrayBuffer.isView(optionsOrLegacyUvs) || Array.isArray(optionsOrLegacyUvs);
        const options = usingLegacyUvs ? legacyOptions : optionsOrLegacyUvs;
        this.map = texture;
        this.normalMap = normalMap;

        // Compatibility only. New render paths read geometry.uvs.
        this.uvs_per_vertex = usingLegacyUvs ? optionsOrLegacyUvs : null;

        this.texture_loaded = false;
        this.texture_number = null;

        this.color = new Float32Array(options.color ?? [1.0, 1.0, 1.0, 1.0]);
        this.shininess = options.shininess ?? 24;
        this.normalStrength = options.normalStrength ?? 1;
        this.waveStrength = options.waveStrength ?? 0;
        this.waveScale = options.waveScale ?? 0.12;
        this.waveSpeed = options.waveSpeed ?? 1;
    }
}
