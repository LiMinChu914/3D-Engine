import { mat3 } from "../lib/glMatrix/src/index.js";
import { Mesh } from "../objects/Mesh.js";
import { Transform } from "../components/Transform.js";
import { MeshRenderer } from "../components/MeshRenderer.js";
import { CameraComponent } from "../components/Camera.js";
import { PointLight } from "../components/PointLight.js";
import { logger } from "../core/Logger.js";
import { Frustum } from "../core/Frustum.js";

// [MODIFIED — LARGE WORLD] Added texture sharing, fog, water vertex animation,
// per-frame render statistics, and bounding-sphere frustum culling.

/** WebGL 1 renderer. GPU resources are created once per mesh and cached. */
export class Renderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl", { antialias: true, alpha: false });
        if (!this.gl) throw new Error("This browser does not support WebGL.");

        this.pixelRatio = Math.min(options.pixelRatio ?? window.devicePixelRatio ?? 1, 2);
        this.wireframe = false;
        this.resources = new WeakMap();
        this.textureCache = new WeakMap();
        this.frustum = new Frustum();
        this.frustumCulling = true;
        this.stats = { drawCalls: 0, visible: 0, culled: 0, triangles: 0 };
        this.log = logger.child("Renderer");
        this.extensions = {
            uintIndices: this.gl.getExtension("OES_element_index_uint"),
            anisotropic: this.gl.getExtension("EXT_texture_filter_anisotropic")
                || this.gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic")
        };

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.clearColor(0.025, 0.03, 0.035, 1);
        this.canvas.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            this.log.error("WebGL context lost");
        });
        this.canvas.addEventListener("webglcontextrestored", () => {
            this.log.warn("WebGL context restored; reload is recommended");
        });

        this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
        this.locations = this.getLocations();
        this.resize();
        this.log.info("WebGL renderer ready", { webgl: this.gl.getParameter(this.gl.VERSION) });
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const message = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${message}`);
        }
        return shader;
    }

    createProgram(vertexSource, fragmentSource) {
        const vertex = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragment = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertex);
        this.gl.attachShader(program, fragment);
        this.gl.linkProgram(program);
        this.gl.deleteShader(vertex);
        this.gl.deleteShader(fragment);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error(`Shader linking failed: ${this.gl.getProgramInfoLog(program)}`);
        }
        return program;
    }

    getLocations() {
        const gl = this.gl;
        const attribute = (name) => gl.getAttribLocation(this.program, name);
        const uniform = (name) => gl.getUniformLocation(this.program, name);
        return {
            attributes: {
                position: attribute("a_position"),
                texcoord: attribute("a_texcoord"),
                normal: attribute("a_normal"),
                tangent: attribute("a_tangent")
            },
            uniforms: {
                model: uniform("u_model"),
                view: uniform("u_view"),
                projection: uniform("u_projection"),
                normalMatrix: uniform("u_normalMatrix"),
                lightPosition: uniform("u_lightPosition"),
                cameraPosition: uniform("u_cameraPosition"),
                lightColor: uniform("u_lightColor"),
                baseColor: uniform("u_baseColor"),
                shininess: uniform("u_shininess"),
                normalStrength: uniform("u_normalStrength"),
                time: uniform("u_time"),
                waveStrength: uniform("u_waveStrength"),
                waveScale: uniform("u_waveScale"),
                waveSpeed: uniform("u_waveSpeed"),
                fogColor: uniform("u_fogColor"),
                fogNear: uniform("u_fogNear"),
                fogFar: uniform("u_fogFar"),
                map: uniform("u_map"),
                normalMap: uniform("u_normalMap")
            }
        };
    }

    resize() {
        const width = Math.max(1, Math.floor(this.canvas.clientWidth * this.pixelRatio));
        const height = Math.max(1, Math.floor(this.canvas.clientHeight * this.pixelRatio));
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        this.gl.viewport(0, 0, width, height);
        return width / height;
    }

    createBuffer(data, target = this.gl.ARRAY_BUFFER) {
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(target, buffer);
        this.gl.bufferData(target, data, this.gl.STATIC_DRAW);
        return buffer;
    }

    createTexture(image, isNormalMap = false) {
        const cached = this.textureCache.get(image);
        if (cached) return cached;
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);

        if (this.extensions.anisotropic && !isNormalMap) {
            const ext = this.extensions.anisotropic;
            const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(max, 8));
        }
        this.textureCache.set(image, texture);
        return texture;
    }

    createMeshResources(renderable) {
        const { geometry, material } = renderable;
        const resources = {
            position: this.createBuffer(geometry.vertices),
            // [MODIFIED] UV is a vertex attribute and therefore belongs to Geometry.
            texcoord: this.createBuffer(geometry.uvs?.length
                ? geometry.uvs
                : new Float32Array(material.uvs_per_vertex ?? geometry.vertice_num * 2)),
            normal: this.createBuffer(geometry.normals),
            tangent: this.createBuffer(renderable.tangents ?? renderable.normalMapTangent),
            index: this.createBuffer(geometry.indices, this.gl.ELEMENT_ARRAY_BUFFER),
            map: this.createTexture(material.map),
            normalMap: this.createTexture(material.normalMap, true),
            count: geometry.indices.length,
            indexType: geometry.indices instanceof Uint32Array ? this.gl.UNSIGNED_INT : this.gl.UNSIGNED_SHORT
        };

        if (resources.indexType === this.gl.UNSIGNED_INT && !this.extensions.uintIndices) {
            throw new Error("This mesh requires 32-bit indices, which this browser does not support.");
        }
        const resourceKey = renderable.resourceKey ?? renderable;
        this.resources.set(resourceKey, resources);
        this.log.debug("GPU resources created", {
            vertices: geometry.vertices.length / 3,
            triangles: geometry.indices.length / 3
        });
        return resources;
    }

    bindAttribute(buffer, location, size) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.enableVertexAttribArray(location);
        this.gl.vertexAttribPointer(location, size, this.gl.FLOAT, false, 0, 0);
    }

    // [MODIFIED] Shared draw path for both legacy Mesh and component MeshRenderer.
    drawRenderable(renderable, model, lightPosition, lightColor, cameraPosition, viewMatrix, projectionMatrix, environment = {}) {
        const gl = this.gl;
        const resourceKey = renderable.resourceKey ?? renderable;
        const resources = this.resources.get(resourceKey) ?? this.createMeshResources(renderable);
        const { attributes, uniforms } = this.locations;
        const normalMatrix = mat3.normalFromMat4(mat3.create(), model);

        this.bindAttribute(resources.position, attributes.position, 3);
        this.bindAttribute(resources.texcoord, attributes.texcoord, 2);
        this.bindAttribute(resources.normal, attributes.normal, 3);
        this.bindAttribute(resources.tangent, attributes.tangent, 3);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, resources.index);

        gl.uniformMatrix4fv(uniforms.model, false, model);
        gl.uniformMatrix4fv(uniforms.view, false, viewMatrix);
        gl.uniformMatrix4fv(uniforms.projection, false, projectionMatrix);
        gl.uniformMatrix3fv(uniforms.normalMatrix, false, normalMatrix);
        gl.uniform3fv(uniforms.lightPosition, lightPosition);
        gl.uniform3fv(uniforms.cameraPosition, cameraPosition);
        gl.uniform3fv(uniforms.lightColor, lightColor);
        gl.uniform4fv(uniforms.baseColor, renderable.material.color);
        gl.uniform1f(uniforms.shininess, renderable.material.shininess);
        gl.uniform1f(uniforms.normalStrength, renderable.material.normalStrength);
        gl.uniform1f(uniforms.time, environment.time ?? 0);
        gl.uniform1f(uniforms.waveStrength, renderable.material.waveStrength ?? 0);
        gl.uniform1f(uniforms.waveScale, renderable.material.waveScale ?? 0.12);
        gl.uniform1f(uniforms.waveSpeed, renderable.material.waveSpeed ?? 1);
        const fog = environment.fog ?? { color: [0, 0, 0], near: 1e5, far: 1e6 };
        gl.uniform3fv(uniforms.fogColor, fog.color);
        gl.uniform1f(uniforms.fogNear, fog.near);
        gl.uniform1f(uniforms.fogFar, fog.far);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, resources.map);
        gl.uniform1i(uniforms.map, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, resources.normalMap);
        gl.uniform1i(uniforms.normalMap, 1);

        gl.drawElements(this.wireframe ? gl.LINES : gl.TRIANGLES, resources.count, resources.indexType, 0);
        this.stats.drawCalls += 1;
        this.stats.visible += 1;
        this.stats.triangles += resources.count / 3;
    }

    drawMesh(mesh, scene, camera) {
        this.drawRenderable(
            mesh,
            mesh.world_matrix,
            scene.light,
            scene.lightColor ?? [1, 1, 1],
            camera.position,
            camera.viewMatrix,
            camera.projectionMatrix
        );
    }

    render(scene, camera) {
        // [NEW] Component World is now the primary path; legacy Scene remains compatible.
        if (scene?.isComponentWorld) return this.renderComponentWorld(scene, camera);

        const gl = this.gl;
        const aspect = this.resize();
        if (camera.fAspectRatio !== aspect) camera.set_fAspectRatio(aspect);
        camera.update_projectionMatrix();
        camera.update_viewMatrix();
        scene.updateWorldMatrix();

        gl.clearColor(...(scene.background ?? [0.025, 0.03, 0.035, 1]));
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.program);
        this.stats = { drawCalls: 0, visible: 0, culled: 0, triangles: 0 };

        scene.traverse((object) => {
            if (object !== scene && object.visible && object instanceof Mesh) {
                this.drawMesh(object, scene, camera);
            }
        });
    }

    renderComponentWorld(world, cameraEntity) {
        const camera = cameraEntity?.get(CameraComponent);
        const cameraTransform = cameraEntity?.get(Transform);
        if (!camera || !cameraTransform) {
            throw new Error("Component rendering requires an Entity with Transform and CameraComponent.");
        }

        const gl = this.gl;
        const aspect = this.resize();
        world.updateTransforms();
        camera.updateMatrices(aspect);
        this.frustum.setFromMatrices(camera.projectionMatrix, camera.viewMatrix);

        const lightEntity = world.query(PointLight, Transform)[0];
        const light = lightEntity?.get(PointLight);
        const lightTransform = lightEntity?.get(Transform);
        const lightPosition = lightTransform?.worldMatrix.subarray(12, 15) ?? [3, 3, 0];
        const lightColor = light?.getRenderColor() ?? [1, 1, 1];

        gl.clearColor(...world.background);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.program);
        this.stats = { drawCalls: 0, visible: 0, culled: 0, triangles: 0 };
        const environment = { time: performance.now() / 1000, fog: world.fog };

        for (const entity of world.query(MeshRenderer, Transform)) {
            const renderable = entity.get(MeshRenderer);
            if (!renderable.enabled) continue;
            const transform = entity.get(Transform);
            if (this.frustumCulling && renderable.frustumCulled !== false
                && !this.frustum.intersectsGeometry(renderable.geometry, transform.worldMatrix)) {
                this.stats.culled += 1;
                continue;
            }
            this.drawRenderable(
                renderable,
                transform.worldMatrix,
                lightPosition,
                lightColor,
                cameraTransform.worldMatrix.subarray(12, 15),
                camera.viewMatrix,
                camera.projectionMatrix,
                environment
            );
        }
    }

    disposeMesh(renderable) {
        const resourceKey = renderable.resourceKey ?? renderable;
        const resources = this.resources.get(resourceKey);
        if (!resources) return;
        for (const key of ["position", "texcoord", "normal", "tangent", "index"]) {
            this.gl.deleteBuffer(resources[key]);
        }
        this.gl.deleteTexture(resources.map);
        this.gl.deleteTexture(resources.normalMap);
        this.resources.delete(resourceKey);
    }
}

const VERTEX_SHADER = `
    attribute vec3 a_position;
    attribute vec2 a_texcoord;
    attribute vec3 a_normal;
    attribute vec3 a_tangent;

    uniform mat4 u_model;
    uniform mat4 u_view;
    uniform mat4 u_projection;
    uniform mat3 u_normalMatrix;
    uniform float u_time;
    uniform float u_waveStrength;
    uniform float u_waveScale;
    uniform float u_waveSpeed;

    varying vec2 v_texcoord;
    varying vec3 v_worldPosition;
    varying vec3 v_normal;
    varying vec3 v_tangent;
    varying float v_viewDepth;

    void main() {
        vec3 animatedPosition = a_position;
        animatedPosition.y += u_waveStrength * (
            sin((a_position.x + u_time * u_waveSpeed) * u_waveScale)
            + cos((a_position.z - u_time * u_waveSpeed * 0.73) * u_waveScale * 1.27)
        );
        vec4 worldPosition = u_model * vec4(animatedPosition, 1.0);
        vec4 viewPosition = u_view * worldPosition;
        v_worldPosition = worldPosition.xyz;
        v_texcoord = a_texcoord;
        v_normal = normalize(u_normalMatrix * a_normal);
        v_tangent = normalize(u_normalMatrix * a_tangent);
        v_viewDepth = -viewPosition.z;
        gl_Position = u_projection * viewPosition;
    }
`;

const FRAGMENT_SHADER = `
    precision mediump float;

    uniform sampler2D u_map;
    uniform sampler2D u_normalMap;
    uniform vec3 u_lightPosition;
    uniform vec3 u_cameraPosition;
    uniform vec3 u_lightColor;
    uniform vec4 u_baseColor;
    uniform float u_shininess;
    uniform float u_normalStrength;
    uniform vec3 u_fogColor;
    uniform float u_fogNear;
    uniform float u_fogFar;

    varying vec2 v_texcoord;
    varying vec3 v_worldPosition;
    varying vec3 v_normal;
    varying vec3 v_tangent;
    varying float v_viewDepth;

    void main() {
        vec3 N = normalize(v_normal);
        vec3 T = normalize(v_tangent - dot(v_tangent, N) * N);
        vec3 B = normalize(cross(N, T));
        vec3 sampledNormal = texture2D(u_normalMap, v_texcoord).xyz * 2.0 - 1.0;
        sampledNormal.xy *= u_normalStrength;
        N = normalize(mat3(T, B, N) * sampledNormal);

        vec3 lightDirection = normalize(u_lightPosition - v_worldPosition);
        vec3 viewDirection = normalize(u_cameraPosition - v_worldPosition);
        vec3 halfDirection = normalize(lightDirection + viewDirection);
        float diffuse = max(dot(N, lightDirection), 0.0);
        float specular = pow(max(dot(N, halfDirection), 0.0), u_shininess);
        vec3 albedo = texture2D(u_map, v_texcoord).rgb * u_baseColor.rgb;
        vec3 ambient = albedo * 0.16;
        vec3 color = ambient + albedo * diffuse * u_lightColor + specular * u_lightColor * 0.35;
        color = color / (color + vec3(1.0));
        color = pow(color, vec3(1.0 / 2.2));
        float fogAmount = smoothstep(u_fogNear, u_fogFar, v_viewDepth);
        color = mix(color, u_fogColor, fogAmount);
        gl_FragColor = vec4(color, u_baseColor.a);
    }
`;
