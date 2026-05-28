---
name: asset-inventory
description: 项目全部资产的完整清单、路径、用法，已全部就绪
metadata:
  type: project
---

## 资产清单（全部已获取）

### 3D模型 — `assets/models/`
| 资产 | 路径 | 用法 |
|------|------|------|
| 城墙 | `assets/models/wall.glb` | LoadModel |
| 主角 | `assets/models/character/` — shoot.glb + walk.glb + Firing Rifle.fbx | LoadModel + LoadModelAnimations |
| 近战小怪 | `assets/models/monsters/monster1/` — walk.glb + attack.glb + death.glb | 同上 |
| 远程小怪 | `assets/models/monsters/monster2/` — walk.glb + shoot.glb + death.glb | 同上 |
| 肉盾大怪 | `assets/models/monsters/monster3/` — walk.glb + attack.glb + death.glb | 同上 |
| Boss | `assets/models/Boss/` — death.glb | LoadModel |
| 普通炮台 | `assets/models/towers/tower1/tower1.1.glb` | LoadModel |
| 范围炮台 | `assets/models/towers/tower2/tower2.glb` | LoadModel |

### 天空 — 纯代码方案
- `ClearBackground(SKYBLUE)` 暗橙棕色 + 雾效，无外部资源
- 参考 [[sky-fog]] 了解更多

### 地面 — `assets/ground-unity/`
- `windswept-wasteland_albedo.png` — 主贴图，2048²，无缝
- `normal-ogl.png` / `ao.png` / `height.png` — 可选附加贴图
- 用法：LoadTexture → 贴在 DrawPlane 大平面上

### 弹丸 — 零模型
详见 [[projectiles-no-models]]

### 特效贴图 — `assets/combat_magic_vfx/extracted_textures/`
- fire/ (4张) — 火焰贴图
- explosion/ (3张) — 爆炸烟雾/脉冲/闪电圈
- hit/ (11张) — 命中水花/裂痕/光晕/星形
- trail/ (7张) — 拖尾能量/闪电/光带
- dissipate/ (5张) — 消散旋涡/能量环
- unused/ (7张) — Spike模型贴图，暂不用
- 用法：LoadTexture + DrawTextureRec 逐帧序列帧动画

### UI — `assets/UI/kenney_ui-pack/`
详见 [[ui-kenney-pack]]

### 天空盒（备用，暂不使用）
`assets/Skybox/` — 3套天空盒（City Night, Office, Cloudy Sky），当前方案用纯代码天空