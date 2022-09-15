
import { Shaders } from "./shaders.js";

export class GLScreen {

    // animation
    #start = false;
    #background = new Float32Array(4);

    // fps
    #maxHistory = 60;
    #fpsHistory = new Float32Array(this.#maxHistory);
    #historyNdx = 0;
    #historyTotal = 0;
    #then = 0;
    #fps = 0;

    #initGL = () => {
        this.shaders = Shaders.getShaders(this.gl);
        this.gl.enable(this.gl.DEPTH_TEST);

        this.gl.viewportWidth = this.canvas.clientWidth;
        this.gl.viewportHeight = this.canvas.clientHeight;

        this.setAspectRatio();
        this.setViewport();
        this.setBackground([0.8, 0.9, 1.0, 1.0]);
    };

    #resetFpsCounter = () => {
        this.#historyNdx = 0;
        this.#historyTotal = 0;
        this.#then = 0;
    };

    #calculateFps = (now) => {
        const deltaTime = now - this.#then;
        this.#then = now;
        this.#historyTotal += deltaTime - this.#fpsHistory[this.#historyNdx];
        this.#fpsHistory[this.#historyNdx] = deltaTime;
        this.#historyNdx = (this.#historyNdx + 1) % this.#maxHistory;
        this.#fps = (1000 / (this.#historyTotal / this.#maxHistory)).toFixed(1);
    }

    constructor(canvas) {
        this.canvas = canvas;
        this.gl = this.canvas.getContext("webgl");
        this.#initGL();

        this.#start = false;
    }

    // setters/getters

    setAspectRatio = (ratio = this.canvas.width / this.canvas.height) => {
        this.aspectRatio = ratio;
        this.scale = [1.0, this.aspectRatio];
    };

    setViewport = (x = 0, y = 0, width = this.canvas.width, height = this.canvas.height) => {
        this.gl.viewport(x, y, width, height);
    };

    setBackground = (color) => {
        this.#background[0] = color[0];
        this.#background[1] = color[1];
        this.#background[2] = color[2];
        this.#background[3] = color[3];
        this.gl.clearColor(...this.#background);
    };

    getFps = () => {
        return this.#fps;
    };

    // animation

    start = (callback) => {
        if (this.#start)
            return;
        this.#start = true;
        this.#resetFpsCounter();
        const update = (now) => {
            this.#calculateFps(now);
            callback();
            if (this.#start)
                requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    };

    stop = () => {
        this.#start = false;
        this.#fps = 0;
    };

    beginFrame = () => {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    // graphic drawing

    drawSingleColorVertices = (verteices, color, n_verteices, mode) => {
        if (!(verteices instanceof Float32Array))
            verteices = new Float32Array(verteices);

        const program = this.shaders.singleColorPolygonShader.program;
        const vertexBuffer = this.shaders.singleColorPolygonShader.buffers.vertex;

        this.gl.useProgram(program);

        // set globals
        const scaleLocation = this.gl.getUniformLocation(program, "u_scale");
        this.gl.uniform2fv(scaleLocation, this.scale);

        const colorLocation = this.gl.getUniformLocation(program, "u_color");
        this.gl.uniform4fv(colorLocation, color);

        // set attributes
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, verteices, this.gl.STREAM_DRAW);

        const positionLocation = this.gl.getAttribLocation(program, "a_position");
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.drawArrays(mode, 0, n_verteices);
    };

    drawVertices = (verteices, colors, n_verteices, mode) => {
        if (!(verteices instanceof Float32Array))
            verteices = new Float32Array(verteices);
        if (!(colors instanceof Float32Array))
            colors = new Float32Array(colors);

        const program = this.shaders.polygonShader.program;
        const vertexBuffer = this.shaders.polygonShader.buffers.vertex;
        const colorBuffer = this.shaders.polygonShader.buffers.color;

        this.gl.useProgram(program);

        // set globals
        const scaleLocation = this.gl.getUniformLocation(program, "u_scale");
        this.gl.uniform2fv(scaleLocation, this.scale);

        // set attributes
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, verteices, this.gl.STREAM_DRAW);

        const positionLocation = this.gl.getAttribLocation(program, "a_position");
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, colors, this.gl.STREAM_DRAW);

        const colorLocation = this.gl.getAttribLocation(program, "a_color");
        this.gl.enableVertexAttribArray(colorLocation);
        this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.drawArrays(mode, 0, n_verteices);
    };

    drawSingleColorPolygon = (verteices, color, n_verteices) => {
        this.drawSingleColorVertices(verteices, color, n_verteices, this.gl.TRIANGLE_FAN);
    };

    drawPolygon = (verteices, colors, n_verteices) => {
        this.drawVertices(verteices, colors, n_verteices, this.gl.TRIANGLE_FAN);
    };

    drawTexturePolygon = () => {

    };

}
