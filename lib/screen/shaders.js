import { buildShaderProgram } from "./gl.js";

const shaders_src = {
    singleColorPolygonShader: {
        vertex: `
        attribute vec3 a_position;

        uniform vec2 u_scale;
        
        void main() {
            vec2 position = vec2(a_position[0], a_position[1]);
            float z_index = a_position[2];
            gl_Position = vec4(position * u_scale, z_index, 1.0);
        }
        `,
        fragment: `
        precision mediump float;
        
        uniform vec4 u_color;

        void main() {
            gl_FragColor = u_color;
        }
        `
    },
    polygonShader: {
        vertex: `
        attribute vec3 a_position;
        attribute vec4 a_color;

        uniform vec2 u_scale;

        varying vec4 v_color;
        
        void main() {
            vec2 position = vec2(a_position[0], a_position[1]);
            float z_index = a_position[2];
            gl_Position = vec4(position * u_scale, z_index, 1.0);
            
            v_color = a_color;
        }
        `,
        fragment: `
        precision mediump float;
        
        varying vec4 v_color;

        void main() {
            gl_FragColor = v_color;
        }
        `
    },
    polygonTextureShader: {
        vertex: `
        attribute vec3 a_position;
        attribute vec2 a_texcoord;

        uniform vec2 u_scale;

        varying vec2 v_texcoord;
        
        void main() {
            vec2 position = vec2(a_position[0], a_position[1]);
            float z_index = a_position[2];
            gl_Position = vec4(position * u_scale, z_index, 1.0);

            v_texcoord = a_texcoord;
        }
        `,
        fragment: `
        precision mediump float;

        varying vec2 v_texcoord;
        
        uniform sampler2D u_texture;

        void main() {
            gl_FragColor = texture2D(u_texture, v_texcoord);
        }
        `
    }
}

export class Shaders {

    static #initialized = false;

    static shaders = {
        singleColorPolygonShader: {
            program: null,
            buffers: {
                vertex: null
            }
        },
        polygonShader: {
            program: null,
            buffers: {
                vertex: null,
                color: null
            }
        },
        polygonTextureShader: {
            program: null,
            buffers: {

            }
        }
    };

    static #compileShaders = (gl) => {
        Shaders.shaders.singleColorPolygonShader.program = buildShaderProgram(gl, [
            {
                type: gl.VERTEX_SHADER,
                code: shaders_src.singleColorPolygonShader.vertex
            },
            {
                type: gl.FRAGMENT_SHADER,
                code: shaders_src.singleColorPolygonShader.fragment
            }
        ]);
        Shaders.shaders.polygonShader.program = buildShaderProgram(gl, [
            {
                type: gl.VERTEX_SHADER,
                code: shaders_src.polygonShader.vertex
            },
            {
                type: gl.FRAGMENT_SHADER,
                code: shaders_src.polygonShader.fragment
            }
        ]);
        Shaders.shaders.polygonTextureShader.program = buildShaderProgram(gl, [
            {
                type: gl.VERTEX_SHADER,
                code: shaders_src.polygonTextureShader.vertex
            },
            {
                type: gl.FRAGMENT_SHADER,
                code: shaders_src.polygonTextureShader.fragment
            }
        ]);
    };

    static #createBuffers = (gl) => {
        { // singleColorPolygonShader
            const vertexBuffer = gl.createBuffer();
            Shaders.shaders.singleColorPolygonShader.buffers.vertex = vertexBuffer;
            //gl.useProgram(Shaders.programs.singleColorPolygonShader);
            //const vertexBuffer = gl.createBuffer();
            //gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        }
        { // polygonShader
            const vertexBuffer = gl.createBuffer();
            const colorBuffer = gl.createBuffer();
            Shaders.shaders.polygonShader.buffers.vertex = vertexBuffer;
            Shaders.shaders.polygonShader.buffers.color = colorBuffer;
            //gl.useProgram(Shaders.programs.polygonShader);
            //const vertexBuffer = gl.createBuffer();
            //gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            //const colorBuffer = gl.createBuffer();
            //gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        }
        // polygonTextureShader
    };

    static getShaders(gl) {
        if (!Shaders.#initialized) {
            Shaders.#compileShaders(gl);
            Shaders.#createBuffers(gl);
            Shaders.#initialized = true;
        }
        return Shaders.shaders;
    }

}
