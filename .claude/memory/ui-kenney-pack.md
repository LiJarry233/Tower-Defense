---
name: ui-kenney-pack
description: 所有UI元素必须使用Kenney UI Pack资源，不允许自绘或引入其他UI素材
metadata:
  type: project
---

游戏所有UI界面使用 `assets/UI/kenney_ui-pack/` 下的素材。

**可用资源：**
- 按钮：rectangle / round / square，6种样式（flat, border, depth, gloss, gradient, line）
- 箭头：basic + decorative，4方向，普通/小号
- 勾选框：round / square，含 color + grey 变体
- 滑块：horizontal / vertical
- 图标：checkmark, circle, cross, square 及其 outline 版
- 星星、滑动条手柄
- 5种颜色：Blue, Green, Grey, Red, Yellow
- 2种分辨率：Default / Double
- 字体：Kenney Future.ttf + Kenney Future Narrow.ttf
- 音效：Sounds 目录下

路径格式：`assets/UI/kenney_ui-pack/PNG/{Color}/{Size}/{element}.png`

**Why:** 用户已选定整套 UI 素材，保持 UI 风格统一。
**How to apply:** ui.h/cpp 中所有面板、按钮、HUD 元素通过 LoadTexture 加载此目录下的 PNG，不自己画形状。菜单、暂停、结算、存档选择、关卡选择、炮台选择等全部使用此资源。