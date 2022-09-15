export function getFileContent(path) {
    let str = null;
    let rawFile = new XMLHttpRequest();
    rawFile.open("GET", path, false);
    rawFile.onreadystatechange = function () {
        if (rawFile.readyState === 4) {
            if (rawFile.status === 200 || rawFile.status == 0) {
                str = rawFile.responseText;
            }
        }
    };
    rawFile.send(null);
    return str;
}

/**
 * @param {String} str 
 */
export function* readByLine(str) {
    let loc = 0;
    while (loc < str.length) {
        const temp = str.indexOf("\n", loc);
        if (temp == -1)
            return;
        const len = temp - loc;
        if (loc != temp)
            yield str.substring(loc, loc + len);
        loc = temp + 1;
    }
}

/**
 * @param {String} str 
 */
export function parseObj(str) {
    const v = [];
    const vt = [];
    const vn = [];
    const indices_map = new Map();
    let vertex_map_size = 0;
    const indices = [];
    for (let it = readByLine(str), line = it.next(); !line.done; line = it.next()) {
        const line_sp = line.value.split(" ");
        switch (line_sp[0]) {
            case "v":
                v.push(parseFloat(line_sp[1]), parseFloat(line_sp[2]), parseFloat(line_sp[3]));
                break;
            case "vt":
                vt.push(parseFloat(line_sp[1]), parseFloat(line_sp[2]));
                break;
            case "vn":
                vn.push(parseFloat(line_sp[1]), parseFloat(line_sp[2]), parseFloat(line_sp[3]));
                break;
            case "f":
                for (let i = 1; i < line_sp.length; i++) {
                    if (indices_map.has(line_sp[i]))
                        continue;
                    indices_map.set(line_sp[i], vertex_map_size++);
                }
                for (let i = 2; i < line_sp.length - 1; i++)
                    indices.push(line_sp[1], line_sp[i], line_sp[i + 1]);
                break;
        }
    }
    for (let i = 0; i < indices.length; i++) {
        indices[i] = indices_map.get(indices[i]);
    }
    const vertices = new Float32Array(vertex_map_size * 3);
    const uvs = new Float32Array(vertex_map_size * 2);
    const normals = new Float32Array(vertex_map_size * 3);
    for (const [key, value] of indices_map) {
        const sp = key.split("/");
        const vi = 3 * (parseInt(sp[0]) - 1);
        const uvi = 2 * (parseInt(sp[1]) - 1);
        const ni = 3 * (parseInt(sp[2]) - 1);
        const times_2_value = 2 * value;
        const times_3_value = 3 * value;
        vertices[times_3_value] = v[vi];
        vertices[times_3_value + 1] = v[vi + 1];
        vertices[times_3_value + 2] = v[vi + 2];
        uvs[times_2_value] = vt[uvi];
        uvs[times_2_value + 1] = vt[uvi + 1];
        normals[times_3_value] = vn[ni];
        normals[times_3_value + 1] = vn[ni + 1];
        normals[times_3_value + 2] = vn[ni + 2];
    }
    return {
        vertices: vertices,
        uvs: uvs,
        normals: normals,
        indices: new Uint16Array(indices)
    };
}

/**
 * @param {String} url 
 */
export function readObj(url) {
    const obj_str = getFileContent(url);
    return parseObj(obj_str);
}
