// [MODIFIED — LARGE WORLD] Interactive documentation now reflects UV ownership,
// bounds/culling, and the standalone world application.
const COMPONENTS = {
    object3d: {
        index: "CLASS / 01", type: "OOP COMPATIBILITY", name: "Object3D", status: "MODIFIED", source: "core/Object3D.js",
        summary: "原始繼承架構的 transform 基底。現在保留給舊 Scene、Mesh、Camera，相容既有 API。",
        responsibilities: ["保存 position、rotation、scale", "維護 parent / children 場景樹", "計算 local matrix 與 world matrix", "提供 traverse() 深度優先遍歷"],
        api: ["add()", "remove()", "traverse()", "getLocalMatrix()", "updateWorldMatrix()", "visible"],
        relations: "Scene、Mesh、Camera 都繼承 Object3D；Renderer 透過場景樹取得每個 Mesh 的 world matrix。",
        debt: "Transform 是公開 typed array，沒有 dirty flag；目前每幀都會重算整棵場景樹。"
    },
    geometry: {
        index: "CLASS / 02", type: "SHARED CORE", name: "Geometry", status: "MODIFIED", source: "core/Geometry.js",
        summary: "保存模型的幾何資料，將一般陣列轉成可上傳 GPU 的 typed arrays。",
        responsibilities: ["保存 vertices、normals、uvs、indices", "選擇 16-bit 或 32-bit index", "計算 bounding box / sphere", "支援幾何旋轉與位移"],
        api: ["vertices", "normals", "uvs", "indices", "boundingBox", "boundingSphere", "computeBounds()", "set_uvs()"],
        relations: "由 OBJ Loader 產生資料，再交給 Mesh；Renderer 會把 Geometry 上傳為 GPU buffer。",
        debt: "UV 與 bounds 已歸位；下一步應改成通用 attributes map，並加入 version、dirty tracking 與 GPU partial update。"
    },
    material: {
        index: "CLASS / 03", type: "SHARED CORE", name: "Material", status: "MODIFIED", source: "core/Material.js",
        summary: "描述表面的貼圖與光照參數，決定 Mesh 在 shader 中呈現出的外觀。",
        responsibilities: ["保存 diffuse texture 與 normal map", "提供 color、shininess", "控制 normalStrength", "提供水面 wave uniforms"],
        api: ["map", "normalMap", "color", "shininess", "normalStrength", "waveStrength", "waveScale", "waveSpeed"],
        relations: "Material 與 Geometry 一起被 Mesh 組合；Renderer 讀取其貼圖和 uniforms。",
        debt: "UV 已移至 Geometry；仍缺 shader type、透明、雙面、roughness、metalness 與 dispose 生命周期。"
    },
    mesh: {
        index: "CLASS / 04", type: "OOP COMPATIBILITY", name: "Mesh", status: "MODIFIED", source: "objects/Mesh.js",
        summary: "原始可渲染場景節點；新程式改用 Entity + Transform + MeshRenderer 組合。",
        responsibilities: ["組合 Geometry 與 Material", "繼承 Object3D transform", "依 indexed triangles 計算 tangent", "作為 Scene 中的 renderable node"],
        api: ["geometry", "material", "normalMapTangent", "computeTangentBitangent()"],
        relations: "繼承 Object3D，被 Scene 收納，最後由 Renderer 判斷 instanceof Mesh 後繪製。",
        debt: "constructor 會同步計算全部 tangent；大型模型會卡住主執行緒，應移至 loader、worker 或 geometry preprocessing。"
    },
    scene: {
        index: "CLASS / 05", type: "OOP COMPATIBILITY", name: "Scene", status: "MODIFIED", source: "scene/Scene.js",
        summary: "原始場景樹根節點；新 component 路徑使用 World 保存 Entity 與 component index。",
        responsibilities: ["作為 Object3D root", "透過 add() 管理場景物件", "保存背景色", "保存與旋轉 light position"],
        api: ["objects", "background", "light", "lightColor", "add()", "rotateY_light()"],
        relations: "繼承 Object3D；應用層加入 Mesh，Renderer 從 Scene 開始 traverse。",
        debt: "光源只是公開向量，尚未抽象成 AmbientLight、PointLight、DirectionalLight 等場景節點。"
    },
    camera: {
        index: "CLASS / 06", type: "OOP COMPATIBILITY", name: "Camera", status: "MODIFIED", source: "cameras/camera.js",
        summary: "描述觀察者位置與透視投影，提供 view matrix 和 projection matrix。",
        responsibilities: ["管理 FOV、aspect、near、far", "使用 lookAt target 建立 view matrix", "建立 perspective projection", "繼承 Object3D position"],
        api: ["lookAt()", "update_viewMatrix()", "update_projectionMatrix()", "set_fFov()", "set_far_near()"],
        relations: "繼承 Object3D；Renderer 每幀取得 Camera 的 view / projection 與 position。",
        debt: "Camera rotation 尚未和 lookAt 整合，也缺少 OrthographicCamera、controls 與 resize event abstraction。"
    },
    renderer: {
        index: "CLASS / 07", type: "RENDER SYSTEM", name: "Renderer", status: "MODIFIED", source: "Renderer/Renderer.js",
        summary: "WebGL render system，現在同時支援 Component World 查詢與原始 OOP Scene 相容路徑。",
        responsibilities: ["建立 WebGL context 與 shader program", "快取 mesh buffers 與共用 texture", "依 bounding sphere 做 frustum culling", "距離霧、水波與 render stats"],
        api: ["render()", "drawRenderable()", "createMeshResources()", "resize()", "stats", "frustumCulling"],
        relations: "接收 Scene 與 Camera，讀取 Mesh / Geometry / Material，最後呼叫 WebGL API。",
        debt: "責任仍然過多；建議拆成 Program、Texture、BufferGeometry、RenderList 與 WebGLRenderer。"
    },
    glscreen: {
        index: "CLASS / 08", type: "LEGACY CLASS", name: "GLScreen", status: "LEGACY", source: "lib/screen/screen.js",
        summary: "專案早期的 2D polygon drawing wrapper，包含動畫迴圈、FPS 與簡單顏色繪製。",
        responsibilities: ["建立另一個 WebGL context", "管理 requestAnimationFrame", "計算 FPS history", "繪製單色或 vertex-color polygon"],
        api: ["start()", "stop()", "beginFrame()", "drawVertices()", "drawPolygon()", "getFps()"],
        relations: "依賴舊 Shaders registry 和 WebGL；目前展示網站沒有使用它。",
        debt: "和正式 Renderer 重複管理 context、animation 與 drawing，且 texture polygon 尚未完成；應移除或整併。"
    },
    shaders: {
        index: "CLASS / 09", type: "LEGACY CLASS", name: "Shaders", status: "LEGACY", source: "lib/screen/shaders.js",
        summary: "GLScreen 專用的靜態 shader / buffer registry，集中建立三種早期 polygon programs。",
        responsibilities: ["保存 shader source", "延遲編譯 shader programs", "建立共用 vertex / color buffers", "以 singleton 狀態回傳 programs"],
        api: ["getShaders()", "shaders", "#compileShaders()", "#createBuffers()"],
        relations: "呼叫 lib/screen/gl.js helper；只服務 GLScreen，和 Renderer 的 shader 無共用。",
        debt: "全域 static initialized 無法安全支援多個 WebGL context；應由 renderer/context 擁有 program cache。"
    },
    loader: {
        index: "MODULE / 01", type: "ASSET MODULE", name: "OBJ Loader", status: "MODIFIED", source: "read_obj.js",
        summary: "非同步下載並解析 Wavefront OBJ，把文字模型轉成 Geometry 可使用的 typed arrays。",
        responsibilities: ["用 fetch 非同步載入", "解析 v / vt / vn / f", "處理負索引與 polygon triangulation", "依頂點數選擇 index 型別"],
        api: ["loadObj()", "parseObj()", "readObj() [deprecated]"],
        relations: "應用層呼叫 Loader，回傳的 vertices / normals / uvs / indices 全部用來建立 Geometry。",
        debt: "OBJ 不支援現代引擎所需的完整 PBR 與動畫資料；下一個主要 loader 應採 glTF 2.0。"
    },
    app: {
        index: "MODULE / 02", type: "APPLICATION", name: "script.js", status: "MODIFIED", source: "script.js",
        summary: "單物件展示網站的 composition root；大型世界已拆到獨立 world.js。",
        responsibilities: ["組裝物件展示用 World", "載入並快取 Apple / Camera", "處理拖曳、滾輪和控制面板", "每幀旋轉單一展示物件"],
        api: ["startup()", "createModel()", "selectModel()", "animate()", "bindControls()"],
        relations: "它依賴引擎的公開 API，但引擎核心不應反向依賴網站 DOM。",
        debt: "物件展示仍可再拆 controls；世界地形、控制器與動畫已分離為獨立模組。"
    },
    webgl: {
        index: "PLATFORM / 01", type: "BROWSER API", name: "WebGL 1", status: "PLATFORM", source: "Renderer/Renderer.js",
        summary: "瀏覽器提供的 GPU API。Renderer 將 JavaScript 資料轉成 buffers、textures、uniforms 和 draw calls。",
        responsibilities: ["管理 GPU buffers 與 textures", "編譯和執行 GLSL shader", "進行 depth test 與 rasterization", "輸出畫面至 HTML Canvas"],
        api: ["createBuffer()", "texImage2D()", "uniform*()", "drawElements()", "requestAnimationFrame()"],
        relations: "是 Renderer 與 legacy GLScreen 的最底層平台，不是專案自有類別。",
        debt: "WebGL 1 缺少原生 VAO、UBO 等能力；可評估 WebGL 2，同時仍需處理 context lost。"
    }
};

const nodes = [...document.querySelectorAll("[data-component]")];
const detail = {
    index: document.querySelector("#detail-index"),
    type: document.querySelector("#detail-type"),
    name: document.querySelector("#detail-name"),
    status: document.querySelector("#detail-status"),
    summary: document.querySelector("#detail-summary"),
    responsibilities: document.querySelector("#detail-responsibilities"),
    api: document.querySelector("#detail-api"),
    relations: document.querySelector("#detail-relations"),
    debt: document.querySelector("#detail-debt"),
    source: document.querySelector("#detail-source")
};

function showComponent(key, { updateHash = true } = {}) {
    const component = COMPONENTS[key];
    if (!component) return;
    nodes.forEach((node) => node.classList.toggle("selected", node.dataset.component === key));
    detail.index.textContent = component.index;
    detail.type.textContent = component.type;
    detail.name.textContent = component.name;
    detail.status.textContent = component.status;
    detail.status.classList.toggle("legacy", component.status === "LEGACY");
    detail.summary.textContent = component.summary;
    detail.responsibilities.replaceChildren(...component.responsibilities.map((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        return li;
    }));
    detail.api.replaceChildren(...component.api.map((item) => {
        const code = document.createElement("code");
        code.textContent = item;
        return code;
    }));
    detail.relations.textContent = component.relations;
    detail.debt.textContent = component.debt;
    detail.source.href = component.source;
    detail.source.setAttribute("aria-label", `查看 ${component.name} 原始檔`);
    if (updateHash) history.replaceState(null, "", `#${key}`);
}

nodes.forEach((node) => node.addEventListener("click", () => showComponent(node.dataset.component)));
showComponent(location.hash.slice(1) || "object3d", { updateHash: false });
