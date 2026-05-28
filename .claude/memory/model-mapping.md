---
name: model-mapping
description: 每个游戏实体对应的3D模型文件精确映射
metadata:
  type: reference
---

## 模型 → 游戏实体映射

| 游戏实体 | 模型路径 | 动画文件 |
|----------|----------|----------|
| 主角（玩家） | `assets/models/character/军事士兵3d模型.glb` | — |
| 近战小怪 | `assets/models/monsters/monster1/` | walk.glb, attack.glb, death.glb |
| 远程小怪 | `assets/models/monsters/monster2/` | walk.glb, shoot.glb, death.glb |
| 肉盾大怪 | `assets/models/monsters/monster3/` | walk.glb, attack.glb, death.glb |
| 最终Boss | `assets/models/Boss/boss.glb` | — |
| 普通炮台 | `assets/models/towers/tower1/tower1.1.glb` | — |
| 范围炮台 | `assets/models/towers/tower2/tower2.glb` | — |
| 城墙 | `assets/models/wall.glb` | — |

**monster1 = 近战小怪，monster2 = 远程小怪，monster3 = 肉盾大怪。**

**How to apply:** 实现 enemy.h/cpp 时，近战小怪加载 monster1 模型，远程小怪加载 monster2 模型，肉盾大怪加载 monster3 模型。实现 player.h/cpp 时加载 character 模型。实现 turret.h/cpp 时加载 tower1/tower2 模型。