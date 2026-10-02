# World texture set

> `[NEW — TEXTURED WORLD]` Local 1K diffuse and OpenGL normal maps used by
> `world.html?material=textured`. Runtime rendering does not contact a third-party server.

All files were downloaded from [Poly Haven](https://polyhaven.com) and are provided under
the [CC0 license](https://polyhaven.com/license).

| Asset | World use | Author | Source |
|---|---|---|---|
| Leafy Grass | grass / foliage | Charlotte Baglioni | https://polyhaven.com/a/leafy_grass |
| Dirt | terrain side / path | Charlotte Baglioni | https://polyhaven.com/a/dirt |
| Rock 01 | mountain stone | Rob Tuytel | https://polyhaven.com/a/rock_01 |
| Sand 01 | beach | Rob Tuytel | https://polyhaven.com/a/sand_01 |
| Tree Bark 03 | tree trunk | Rob Tuytel | https://polyhaven.com/a/tree_bark_03 |
| Wooden Planks | wood detail | Charlotte Baglioni / Dario Barresi | https://polyhaven.com/a/wooden_planks |
| Snow 01 | mountain snow | Rob Tuytel | https://polyhaven.com/a/snow_01 |
| Brick 4 | building wall | Rob Tuytel | https://polyhaven.com/a/brick_4 |
| Roof Tiles | building roof | Stephan Seeliger | https://polyhaven.com/a/roof_tiles |

Each asset includes `{asset}_diff_1k.jpg` and `{asset}_nor_gl_1k.jpg`. The app combines
these source images into two power-of-two atlases at startup; UVs remain owned by each
`Geometry`, while `Material` only references the resulting textures and uniforms.
