---
name: projectiles-no-models
description: 3D弹丸全部用raylib内置几何体生成，不需要任何3D模型文件
metadata:
  type: project
---

所有弹丸用raylib内置几何体，零建模。

| 弹丸 | 做法 |
|------|------|
| 主角子弹 | 黄色细长圆柱 DrawCylinder + 发光 |
| 普通炮台子弹 | 灰色小球 DrawSphere |
| 爆裂子弹 | 稍大橙色球 DrawSphere + 粒子拖尾 |
| 远程小怪弓箭 | 细杆 + 三角箭头（Cylinder + Cone） |
| Boss能量团 | 大紫色球 + 缩放过波动画 |

**Why:** 弹丸是简单几何体，不需要建模工具，代码里直接拼更快且更好迭代。
**How to apply:** bullet.h/cpp 中的子弹类，渲染时使用 raylib 的 DrawSphere / DrawCylinder / DrawCone 等内置函数，不要尝试加载外部模型文件。