# 原始程式修改對照

> 此專案目錄沒有可用的 Git repository，因此「原始版本」以本次工作開始時讀取到的檔案為基準。原始檔中的修改會以 `[MODIFIED ...]`，新增檔案會以 `[NEW ...]` 標示。

## 本次大型世界修改（最新）

- `[MODIFIED — UV OWNERSHIP]`：UV 從 `Material` 移到 `Geometry.uvs`，舊 constructor 只保留相容讀取。
- `[MODIFIED — LARGE WORLD]`：Geometry 增加 bounding box / sphere；Renderer 增加 frustum culling、fog、水波 shader、texture sharing 與 draw statistics。
- `[MODIFIED — WORLD SCENE EXTRACTION]`：`script.js` 移除混在 Apple / Camera 選單裡的多物件 SCENE。
- `[NEW — WORLD SCENE]`：新增獨立 `world.html`，以 64 個靜態批次 chunk 生成 128×128 的山、海、森林、雪峰與聚落。
- `[NEW — WORLD SCENE]`：世界動畫放在 `world/WorldAnimation.js`，第一人稱控制放在 `world/FirstPersonController.js`，沒有塞回 `script.js`。
- `[MODIFIED — 3D FLIGHT]`：世界控制加入 Space/E 上升、Shift/Q 下降與行動版升降按鈕；水平移動會維持目前離地高度。
- `[NEW — TEXTURED WORLD]`：`world.html?material=textured` 與程序版共用相同 Geometry 生成管線與 seed，改用本地 Poly Haven CC0 diffuse / normal atlas。
- `[NEW — DETAILED ARCHITECTURE]`：架構網站加入五層 runtime dependency、資料擁有權、主要模組生命週期和雙材質管線。

快速尋找標示：

```bash
rg -n "\[NEW|\[MODIFIED|LEGACY" -g '*.js' -g '*.html' -g '*.css'
```

## 架構層級

### 原始版本：Inheritance-based OOP

```js
const mesh = new Mesh(geometry, material); // Mesh extends Object3D
mesh.object_translate([0, 0, -0.2]);
scene.add(mesh);                           // Scene extends Object3D
renderer.render(scene, camera);            // Camera extends Object3D
```

每一種場景物件都必須繼承 `Object3D` 才能擁有 transform。光源則是 `Scene.light` 的特殊欄位。

### 目前版本：Composition-based Components

```js
const model = new Entity("Apple")
    .add(new Transform({ position: [0, 0, -0.2] }))
    .add(new MeshRenderer(geometry, material));

const camera = new Entity("Main Camera")
    .add(new Transform({ position: [0, 0, 2.45] }))
    .add(new CameraComponent({ fov: 36 }));

world.add(model, camera);
renderer.render(world, camera);
```

Entity 不需要繼承特定類別。功能由 Component 組合，Renderer 使用：

```js
world.query(MeshRenderer, Transform)
```

找出可以繪製的 Entity。

## 原始檔案修改

| 檔案 | 原始行為 | 目前行為 | 狀態 |
|---|---|---|---|
| `core/Object3D.js` | 只有 rotation / translation / scale | 加入 scene graph 與 world matrix；現在作為舊 API 相容層 | MODIFIED |
| `core/Geometry.js` | setters 未實作、index 固定 Uint16、沒有 UV/bounds | 擁有 UV、bounding box/sphere，並支援 Uint32 index | MODIFIED |
| `core/Material.js` | 同時持有貼圖與幾何 UV | UV 移除；保留貼圖、表面參數與 wave uniforms | MODIFIED |
| `objects/Mesh.js` | tangent byte offset 錯誤，輸出格式無法上傳 GPU | 共用 `computeTangents()`；網站已改用 MeshRenderer | MODIFIED / COMPATIBILITY |
| `scene/Scene.js` | 保存 objects 與單一 light | 可使用 Object3D children；網站已改用 World + PointLight | MODIFIED / COMPATIBILITY |
| `cameras/camera.js` | 只有 projection，沒有 view matrix | 加入 view / lookAt；網站已改用 CameraComponent | MODIFIED / COMPATIBILITY |
| `Renderer/Renderer.js` | 每幀建立 buffers、無大型世界管理 | GPU/texture 快取、frustum culling、fog、水波、統計 | MODIFIED |
| `read_obj.js` | 同步 XMLHttpRequest | async fetch、負索引、多邊形三角化、Uint32 | MODIFIED |
| `script.js` | 直接建立 Scene / Mesh / Camera，後來混入多物件動畫 | 只負責 Apple / Camera；世界程式完全分離 | MODIFIED |
| `index.html` | 單一 canvas | 物件展示台與獨立「世界場景」按鈕 | MODIFIED |
| `lib/screen/*` | 早期 2D WebGL 路徑 | 未被目前入口引用，整合 GitHub 時已移除 | REMOVED |

## 新增的 Component 架構

| 檔案 | 用途 |
|---|---|
| `core/Entity.js` | Component 容器、attach / detach、生命週期 |
| `components/Component.js` | Component 最小基底合約 |
| `components/Transform.js` | transform、hierarchy、dirty propagation |
| `components/MeshRenderer.js` | Geometry + Material 可渲染元件 |
| `components/Camera.js` | view / projection 相機元件 |
| `components/PointLight.js` | 點光源資料元件 |
| `scene/World.js` | Entity registry、component index、query |
| `core/computeTangents.js` | 新舊 renderable 共用的 tangent 計算 |
| `core/Logger.js` | 分級、scope、history、subscriber、timer |
| `components/Animator.js` | 可掛載的 entity animation behaviour |
| `systems/AnimationSystem.js` | 查詢並更新 Animator + Transform |
| `loaders/gltf.js` | glTF 2.0 JSON、external buffer 與 geometry accessor loader |
| `ui/LoggerPanel.js` | 網站 runtime diagnostics drawer |
| `core/Frustum.js` | 六平面視錐與 bounding-sphere visibility test |
| `world.html` / `world.css` / `world.js` | 獨立大型世界頁、介面與 composition root |
| `world/ProceduralGeometry.js` | 靜態批次 MeshBuilder、程序材質 atlas |
| `world/WorldScene.js` | chunk terrain、biome、森林、聚落與海洋生成 |
| `world/WorldAnimation.js` | 巡航鏡頭、太陽、天空與霧色動畫 |
| `world/FirstPersonController.js` | WASD、Pointer Lock、觸控、地面跟隨與垂直飛行 |
| `assets/polyhaven/world_textures/` | 寫實材質世界使用的 1K CC0 diffuse / OpenGL normal maps |

## 為何保留舊類別

Renderer 目前採漸進式遷移：

- `render(World, cameraEntity)` 是新網站使用的主要路徑。
- `render(Scene, legacyCamera)` 仍然支援原始 API。

等使用端全部完成遷移並加入回歸測試後，才能安全移除 `Object3D`、`Mesh`、`Scene` 與舊 `Camera`，避免一次重寫造成不可追蹤的渲染回歸。未被目前入口引用的 `lib/screen` 已先從發佈內容移除。
