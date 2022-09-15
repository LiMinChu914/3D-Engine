import { vec2, vec3, vec4, mat3, mat4 } from "../lib/glMatrix/src/index.js";

export class Renderer {
    constructor(canvas) {

        this.canvas = canvas;
        this.gl = canvas.getContext("webgl");

        if (this.gl === null) {
            console.log('webgl is not supported.');
            //throw new Error('');
            return;
        }

        this.gl.clearColor(0.0, 0.0, 0.0, 1);
        // Enable the depth test
        this.gl.enable(this.gl.DEPTH_TEST);

        this.vertCode = `
            uniform mat4 u_modelMatrix;
            uniform mat4 u_projectionMatrix;
            uniform vec3 u_light_loc;

            attribute vec3 positions;
            attribute vec2 a_texcoord;
            //attribute vec3 vcamera;

            attribute vec3 vertex_normal;
            attribute vec3 tangent;

            varying vec2 v_texcoord;
            
            varying vec3 v_vertex_normal;
            varying vec3 v_tangent;

            varying vec3 v_pointLight_dir;
            varying vec3 E;

            void main(void) {
                mat4 viewMatrix = u_projectionMatrix * u_modelMatrix;
                gl_Position = viewMatrix * vec4(positions, 1.0);
                v_texcoord = a_texcoord;

                v_vertex_normal = (viewMatrix * vec4(vertex_normal, 1.0)).xyz;
                v_tangent = (viewMatrix * vec4(tangent, 1.0)).xyz;

                v_pointLight_dir = u_light_loc - gl_Position.xyz;
                E = -gl_Position.xyz;
            }
        `;

        this.fragCode = `
            precision mediump float;

            uniform sampler2D textureMap;
            uniform sampler2D normalMap;
     
            uniform vec3 u_lightColor;
            uniform float u_shininess;

            varying vec2 v_texcoord;
            varying vec3 v_pointLight_dir;

            varying vec3 v_vertex_normal;
            varying vec3 v_tangent;

            varying vec3 E;

            void main(void) {
                float ambient = 0.1;

                vec4 normal_uvs = texture2D(normalMap, v_texcoord);
                vec3 normal = normalize(normal_uvs.xyz * 2.0 - 1.0);
                
                vec3 p_normal = normalize(v_vertex_normal);
                vec3 p_tangent = normalize(v_tangent - dot(v_vertex_normal, v_tangent)*v_vertex_normal);
                vec3 p_bitangent = normalize(cross(v_vertex_normal, v_tangent));

                mat3 TBN_Mat = mat3(p_tangent, p_bitangent, p_normal);
                normal = TBN_Mat * normal;

                float diffuse = max(dot(normalize(v_pointLight_dir), normal), 0.0);
                
                vec3 R = reflect(-v_pointLight_dir, normal);
                float specular = pow(max(dot(normalize(R), normalize(E)), 0.0), u_shininess);

                vec4 texColor = texture2D(textureMap, v_texcoord);
                gl_FragColor = vec4(ambient*u_lightColor + specular*u_lightColor + diffuse*u_lightColor.rgb*texColor.rgb, texColor.a);
                
                //texColor = vec4(1.0,1.0,1.0,1.0);
                //gl_FragColor = texColor;
                //gl_FragColor = vec4(normal.xy, -normal.z, 1.0);
                //vec3 colorrr = vec3(normal.xy, -normal.z);
                //gl_FragColor = vec4((colorrr + 1.0) * 0.5, 1.0);
            }
        `;

        this.shaderProgram = null;

        this.textures = [];

        this.create_program(this.vertCode, this.fragCode);
        // Clear the color buffer bit
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        // Set the view port
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    }

    create_buffer(sources, target, usage) {
        let buffer = this.gl.createBuffer();
        this.gl.bindBuffer(target, buffer);
        this.gl.bufferData(target, sources, usage);
        return buffer;
    }

    create_texture(image) {
        let texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0, // level
            this.gl.RGBA, // internalFormat
            this.gl.RGBA, // format
            this.gl.UNSIGNED_BYTE, // type
            image, // data
        );
        this.gl.generateMipmap(this.gl.TEXTURE_2D);

        return texture;
    }

    create_object_textures(mesh) {
        if (!mesh.material.texture_loaded) {
            let obj_textures = {};

            obj_textures['textureMap'] = this.create_texture(mesh.material.map);
            obj_textures['normalMap'] = this.create_texture(mesh.material.normalMap);

            this.textures.push(obj_textures);

            mesh.material.texture_loaded = true;
            mesh.material.texture_number = this.textures.length - 1;
        }

    }

    activate_texture(number) {

        for (let i = 0; i < Object.keys(this.textures[number]).length; i++) {
            const textureUniformLocation = this.gl.getUniformLocation(this.shaderProgram, Object.keys(this.textures[number])[i]);
            this.gl.uniform1i(textureUniformLocation, i);
            this.gl.activeTexture(this.gl.TEXTURE0 + i);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[number][Object.keys(this.textures[number])[i]]);
        }

    }

    create_program(vertCode, fragCode) {
        //vertice shader
        const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertShader, vertCode);
        this.gl.compileShader(vertShader);

        if (!this.gl.getShaderParameter(vertShader, this.gl.COMPILE_STATUS)) {
            console.log(`Error compiling vertex shader:`);
            console.log(this.gl.getShaderInfoLog(vertShader));
        }

        //frag shader
        const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fragShader, fragCode);
        this.gl.compileShader(fragShader);

        if (!this.gl.getShaderParameter(fragShader, this.gl.COMPILE_STATUS)) {
            console.log(`Error compiling fragment shader:`);
            console.log(this.gl.getShaderInfoLog(fragShader));
        }

        //link program
        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertShader);
        this.gl.attachShader(shaderProgram, fragShader);
        this.gl.linkProgram(shaderProgram);
        this.gl.useProgram(shaderProgram);

        this.shaderProgram = shaderProgram;
    }

    enable_attribute(shaderProgram, buffer, target, attribute, size) {
        this.gl.bindBuffer(target, buffer);

        const coord = this.gl.getAttribLocation(shaderProgram, attribute);
        this.gl.enableVertexAttribArray(coord);
        this.gl.vertexAttribPointer(coord, size, this.gl.FLOAT, false, 0, 0);
    }

    get_uniformMatrix(shaderProgram, attribute, matrix) {
        const uLocation = this.gl.getUniformLocation(shaderProgram, attribute);
        this.gl.uniformMatrix4fv(uLocation, false, matrix);
    }

    get_uniform3fv(shaderProgram, attribute, value){
        const uniformLoc = this.gl.getUniformLocation(shaderProgram, attribute);
        this.gl.uniform3fv(uniformLoc, value);
    }

    get_uniform1f(shaderProgram, attribute, value){
        const uniformLoc = this.gl.getUniformLocation(shaderProgram, attribute);
        this.gl.uniform1f(uniformLoc, value);
    }

    get_lights(loc, color, shininess) {
        this.get_uniform3fv(this.shaderProgram, 'u_light_loc', loc);
        this.get_uniform3fv(this.shaderProgram, 'u_lightColor', color);
        this.get_uniform1f(this.shaderProgram, 'u_shininess', shininess);
    }

    render(scene, camera) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        for (let i = 0; i < scene.objects.length; i++) {
            //vertex and indices
            const verticesBuffer = this.create_buffer(scene.objects[i].geometry.vertices, this.gl.ARRAY_BUFFER, this.gl.STATIC_DRAW);
            const indicesBuffer = this.create_buffer(scene.objects[i].geometry.indices, this.gl.ELEMENT_ARRAY_BUFFER, this.gl.STATIC_DRAW);
            //texture uvs and vertex normal and vertex tangent
            const texcoordBuffer = this.create_buffer(scene.objects[i].material.uvs_per_vertex , this.gl.ARRAY_BUFFER, this.gl.STATIC_DRAW);
            const normalBuffer = this.create_buffer(scene.objects[i].geometry.normals, this.gl.ARRAY_BUFFER, this.gl.STATIC_DRAW);
            const tangentBuffer = this.create_buffer(scene.objects[i].normalMapTangent, this.gl.ARRAY_BUFFER, this.gl.STATIC_DRAW);
            //textureMap and normalMap
            this.create_object_textures(scene.objects[i]);
            this.activate_texture(scene.objects[i].material.texture_number);
            //lights
            this.get_lights(scene.light, [1.0, 1.0, 1.0], 10.0);
            //model matrix and projection matrix
            this.get_uniformMatrix(this.shaderProgram, 'u_modelMatrix', scene.objects[i].get_modelMatrix());
            this.get_uniformMatrix(this.shaderProgram, 'u_projectionMatrix', camera.update_projectionMatrix());
            //enable attribute
            this.enable_attribute(this.shaderProgram, verticesBuffer, this.gl.ARRAY_BUFFER, "positions", 3);
            this.enable_attribute(this.shaderProgram, texcoordBuffer, this.gl.ARRAY_BUFFER, "a_texcoord", 2);
            this.enable_attribute(this.shaderProgram, normalBuffer, this.gl.ARRAY_BUFFER, "vertex_normal", 3);
            this.enable_attribute(this.shaderProgram, tangentBuffer, this.gl.ARRAY_BUFFER, "tangent", 3);

            // Draw the triangle
            this.gl.drawElements(this.gl.TRIANGLES, scene.objects[i].geometry.indices.length, this.gl.UNSIGNED_SHORT, 0);
            //this.gl.drawElements(this.gl.LINES, scene.objects[i].geometry.indices.length, this.gl.UNSIGNED_SHORT, 0);

        }

    }

}