import { vec3, mat4 } from "./lib/glMatrix/src/index.js";
import { Object3D } from "./core/Object3D.js";

import { Geometry } from "./core/Geometry.js";
import { Mesh } from "./objects/Mesh.js";
import { Scene } from "./scene/Scene.js";
import { Renderer } from "./Renderer/Renderer.js";
import { Camera } from "./cameras/camera.js";
import { Material } from "./core/Material.js";
import * as teapot from "./teapot.js";

import { readObj } from "./read_obj.js";

window.addEventListener('load', startup);


async function startup() {

    const canvas = document.querySelector("#canvas");

    //console.log(mat4.fromTranslation(mat4.create(), [1,2,3]));

    var vertices_1 = [
        -0.5, 0.5, 0.0,
        -0.5, -0.5, 0.0,
        0.5, -0.5, 0.0,
        0.5, 0.5, 0.0
    ];
    const indices_1 = [
        0, 2, 1,
        0, 3, 2
    ];


    const obj1 = readObj('./apple/food_apple_01_4k.obj');
    const obj2 = readObj('./camera/Camera_01_4k.obj');


    function load_image(src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = src;
            image.onload = () => resolve(image);
        });
    }

    async function load_texture(map_src, normal_src) {
        let map = load_image(map_src);
        let normalMap = load_image(normal_src);
        map = await map;
        normalMap = await normalMap;
        return [map, normalMap];
    }

    
    // let geometry_1 = new Geometry(teapot.vertices, teapot.indices.map(i => i - 1));
    //object 1
    let geometry_1 = new Geometry(obj1.vertices, obj1.indices, obj1.normals);
    let [texture_map1, normal_texture1] = await load_texture('./apple/food_apple_01_diff_4k.jpg', './apple/food_apple_01_nor_gl_4k.jpg');
    let material_1 = new Material(texture_map1, normal_texture1, obj1.uvs);
    
    let mesh_1 = new Mesh(geometry_1, material_1);
    mesh_1.object_translate([0.1, -0.1, -0.2]);
    mesh_1.object_scale([1.2, 1.2, 1.2]);
    //object 2
    let geometry_2 = new Geometry(obj2.vertices, obj2.indices, obj2.normals);
    let [texture_map2, normal_texture2] = await load_texture('./camera/Camera_01_body_diff_4k.jpg', './camera/Camera_01_body_nor_gl_4k.jpg');
    let material_2 = new Material(texture_map2, normal_texture2, obj2.uvs);

    let mesh_2 = new Mesh(geometry_2, material_2);
    mesh_2.object_translate([-0.07, -0.1, -0.2]);
    //mesh_2.object_scale([1.0, 1.0, 1.0]);
    //floor
    let floor_vertices = new Float32Array([-1.0, 0.0, 1.0,
                                        -1.0, 0.0, -1.0,
                                        1.0, 0.0, -1.0,
                                        1.0, 0.0, 1.0]);
    let floor_indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    let floor_normals = new Float32Array([0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0]);
    let floor_uvs = new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0]);

    let geometry_3 = new Geometry(floor_vertices, floor_indices, floor_normals);
    let [texture_map3, normal_texture3] = await load_texture('./bricks/random_bricks_thick_diff_4k.jpg', './bricks/random_bricks_thick_nor_gl_4k.jpg');
    let material_3 = new Material(texture_map3, normal_texture3, floor_uvs);
    let mesh_3 = new Mesh(geometry_3, material_3);
    mesh_3.object_translate([0.0, -0.1, 0.0]);

    const scene = new Scene();
    scene.add(mesh_1, mesh_2, mesh_3);

    setInterval(function () {
        //mesh_1.object_rotateX(0.01);
        mesh_1.object_rotateY(0.01);
        mesh_2.object_rotateY(0.01);
        //mesh_1.object_rotateZ(0.01);
        scene.rotateY_light(0.05);
    }, 10);

    const camera = new Camera(90, canvas.width / canvas.height);

    const renderer = new Renderer(canvas);

    draw();

    function draw() {
        renderer.render(scene, camera);
        requestAnimationFrame(draw);
    }
    
}