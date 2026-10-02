# Flux 3D

Flux 3D 是一個以原生 JavaScript、WebGL 1 與 GLSL ES 實作的輕量 3D 引擎與互動展示。專案不依賴前端框架或打包工具，可直接透過靜態 HTTP server 執行。

目前包含三個主要展示：

- Apple / Camera OBJ 模型檢視器
- 128 × 128 程序化方塊世界
- 使用本地 Poly Haven CC0 材質的寫實世界

另有一個互動式架構頁，可用來查看引擎的模組分層、資料流與渲染流程。

## 快速開始

專案使用 ES modules，模型與貼圖也透過 `fetch()` 載入，因此不能直接雙擊 `index.html`。請在專案根目錄啟動 HTTP server：

```bash
python3 -m http.server 8000
```

接著開啟：

- `http://localhost:8000/`：Apple / Camera 模型展示
- `http://localhost:8000/world.html`：程序材質世界
- `http://localhost:8000/world.html?material=textured`：Poly Haven 寫實材質世界
- `http://localhost:8000/architecture.html`：專案架構導覽

也可以使用其他靜態伺服器，例如 VS Code Live Server。

## 操作方式

### 模型展示

- 拖曳：旋轉視角
- 模型切換：Apple / Camera
- 控制面板：光源角度、法線強度、自動旋轉與線框模式
- `LOG`：開啟 runtime diagnostics

### 世界場景

- `W` `A` `S` `D`：水平移動
- 滑鼠：Pointer Lock 視角控制
- `Space` / `E`：上升
- `Shift` / `Q`：下降
- 行動裝置可使用畫面上的移動與升降控制

## 主要功能

- WebGL 1 即時渲染與 GLSL shader
- Composition-based Entity / Component 架構
- OBJ 非同步載入與基礎 glTF 2.0 geometry loader
- Diffuse map、normal map 與 tangent-space lighting
- GPU buffer / texture 快取與資源釋放
- 程序化地形、biome、森林、聚落、海面與日夜光照
- Static batching、bounding sphere、frustum culling 與距離霧
- 程序材質 atlas 與本地 1K 寫實材質 atlas
- 分級 logger、history、subscriber、timer 與頁面診斷面板
- 舊版 `Object3D` scene graph 相容層

## 架構概覽

```text
Application
├── index.html + script.js
└── world.html + world.js
          │
          ▼
World ── query(Transform, MeshRenderer) ──▶ Renderer
├── Model Entity
│   ├── Transform
│   └── MeshRenderer (Geometry + Material)
├── Camera Entity
│   ├── Transform
│   └── CameraComponent
└── Light Entity
    ├── Transform
    └── PointLight
```

`World` 保存 Entity 並建立 component index；`Renderer` 只查詢具備 `Transform` 與 `MeshRenderer` 的 Entity。相機與光源同樣由 component 組合，不需要繼承特定場景物件類別。

舊版 `Object3D`、`Mesh`、`Scene` 與 `Camera` 仍保留為相容 API。更完整的修改內容請參考 [`CHANGES.md`](CHANGES.md)，或直接開啟 `architecture.html`。

## 專案結構

```text
3D-Engine/
├── index.html                 # 模型展示入口
├── world.html                 # 大型世界入口
├── architecture.html          # 互動式架構說明
├── script.js / world.js       # Application composition roots
├── core/                      # Entity、Geometry、Material、Logger、Frustum
├── components/                # Transform、Camera、MeshRenderer、PointLight
├── systems/                   # Component systems
├── scene/                     # World registry 與舊版 Scene
├── Renderer/                  # WebGL renderer 與 shaders
├── loaders/                   # glTF loader
├── world/                     # 地形、網格、動畫與第一人稱控制
├── ui/                        # Runtime logger panel
├── lib/glMatrix/              # 矩陣與向量運算
├── apple/                     # Apple 執行時 OBJ 與貼圖
├── camera/                    # Camera 執行時 OBJ 與貼圖
└── assets/polyhaven/
    └── world_textures/        # 寫實世界使用的 1K CC0 貼圖
```

## Runtime 資產

Repository 只保留展示執行時會載入的模型與貼圖：

- Apple：OBJ、diffuse map、OpenGL normal map
- Camera：OBJ、diffuse map、OpenGL normal map
- World：9 組 Poly Haven 1K diffuse / OpenGL normal maps

`.blend`、`.fbx`、`.exr`、預覽用 `.png` 與未使用的測試素材不納入版本控制。Poly Haven 世界材質的作者與來源列於 [`assets/polyhaven/world_textures/README.md`](assets/polyhaven/world_textures/README.md)，素材採 CC0 授權。

## 技術限制與後續方向

- 目前以 WebGL 1 為目標，單一 chunk 的 index 仍受 Uint16 vertex 數量限制。
- glTF loader 目前聚焦外部 buffer 與 geometry accessor，尚未涵蓋完整 PBR、骨架與動畫。
- 尚未加入自動化測試、build pipeline、shadow map 與完整資源 reference counting。
- 下一步可導入通用 BufferGeometry attributes、PBR workflow、raycasting、instancing 與 WebGL context restore。

## 技術

- JavaScript ES Modules
- WebGL 1 / GLSL ES
- glMatrix
- HTML / CSS
