# Tower Defense — 3D末日塔防

## 项目背景

一款 3D 末日题材塔防游戏。玩家站在城墙上，抵御源源不断的怪物进攻，保护城墙不被攻破。游戏包含 3 个关卡、4 种怪物、2 种炮台、主角升级系统，以及完整的 UI 流程。

本项目经历三次技术栈迭代，最终选型完成。

---

## 玩法说明

### 游戏目标
保护城墙不被怪物摧毁，消灭所有怪物即为胜利。

### 敌我双方
| 角色 | 说明 |
|------|------|
| **主角** | 站在城墙上，鼠标瞄准 + 左键射击。可按 U 升级（伤害 +100，CD -0.1s） |
| **城墙** | HP 10000，归零则失败 |
| **近战小怪** | 停-走式移动，靠近城墙后近战攻击 |
| **远程小怪** | 持续移动，距墙 30 单位停下，远程射击 |
| **肉盾大怪** | 停-走式移动，血量高，近战攻击 |
| **Boss** | 持续移动，距墙 30 单位停下，远程魔法攻击 |

### 炮台系统
- 城墙上两个固定点位（白色光点）
- 点击光点 → 弹出购买面板
- **普通炮台** 500g：自动索敌，蓝色子弹
- **范围炮台** 1000g：自动索敌，橙色爆炸子弹（溅射伤害）

### 关卡数据（3关）
| 关卡 | 近战 | 远程 | 肉盾 | Boss |
|------|------|------|------|------|
| 1 | 50 | 10 | 0 | 0 |
| 2 | 100 | 20 | 10 | 0 |
| 3 | 100 | 40 | 20 | 1 |

### 存档系统
- 3 个存档槽，localStorage 存储
- 保存关卡进度、金币、城墙血量、炮台状态
- 支持读取和删除

---

## 控制说明

| 操作 | 按键 |
|------|------|
| 移动视角 | WASD / 方向键 |
| 旋转视角 | 鼠标右键拖拽 |
| 缩放 | 鼠标滚轮 |
| 射击 | 鼠标左键 |
| 暂停 | P |
| 升级面板 | U |
| 购买炮台 | 点击城墙上白色光点 |

---

## 技术栈抉择

### 第一代：C++ + raylib
**选型原因**：轻量级 C 库，3D 支持，适合快速原型。

**放弃原因**：
- raylib 只支持 u16 索引（单 Mesh 最多 65535 顶点），16 万顶点 wall.glb 直接索引溢出，模型损坏
- raylib 内嵌 PBR 材质管线不完善，glb 纹理无法正确映射
- assimp 加载后转为 raylib Mesh 结构渲染失败（VAO 有效但 DrawMesh 不可见）
- Windows 下 DLL 依赖链复杂

### 第二代：Godot Engine 4.x
**选型原因**：原生 glTF 支持、内置物理/动画/UI 系统、可视化编辑器。

**放弃原因**：
- AnimationPlayer 实例化后 root_node 断裂——编辑器能播放动画、代码运行不能
- 手动合并三段动画流程繁琐（需保存/加载/重命名），无法 AI 辅助
- 手写 .tscn 格式不被编辑器识别，UID 系统排外
- GDScript 严格类型系统导致频繁编译错误

### 第三代：Three.js + TypeScript + Vite（最终方案）
**选型原因**：
- GLTFLoader 是 Khronos 官方参考实现，PBR 材质 + u32 索引完美支持
- glTF/FBX 加载一行代码，`AnimationMixer` API 直观可靠
- TypeScript 类型系统成熟，Vite 热更新秒级生效
- 零编辑器——全部代码驱动，AI 高度可辅助
- HTML/CSS 做 UI，Kenney UI Pack 图片资源直接使用
- Web Audio API 零依赖实现音效系统
- Electron 可打包为 Windows .exe

---

## 最终实现形式

| 层级 | 技术 |
|------|------|
| 语言 | TypeScript |
| 3D 渲染 | Three.js (WebGL2) |
| 构建工具 | Vite |
| UI | HTML + CSS（Kenney UI Pack 图片素材） |
| 音效 | Web Audio API |
| 打包 | Electron（桌面 .exe） |
| 存档 | localStorage (JSON) |

### 运行方式
```bash
npm install
npm run dev    # 浏览器开发
npm run start  # 构建 + Electron 全屏
```

---

## 项目结构

```
TowerDefense/
├── index.html                # 入口 HTML
├── package.json              # npm 配置
├── vite.config.ts            # Vite 构建配置
├── tsconfig.json             # TypeScript 配置
├── electron.js               # Electron 主进程
├── src/
│   ├── main.ts               # 场景初始化 + 主循环 + 状态机
│   ├── config.ts             # 数值常量
│   ├── gamestate.ts          # 全局游戏状态
│   ├── player.ts             # 主角（瞄准、射击）
│   ├── bullet.ts             # 弹丸系统
│   ├── enemy.ts              # 敌人（AI + 动画状态机）
│   ├── turret.ts             # 炮台（自动索敌）
│   ├── ui.ts                 # UI（菜单/存档/HUD/弹窗）
│   ├── audio.ts              # 音效管理
│   ├── vfx.ts                # 粒子特效
│   └── save.ts               # 存档系统
├── assets/
│   ├── models/               # 3D 模型（glb/fbx）
│   ├── ground-unity/         # 地面贴图
│   ├── combat_magic_vfx/     # 特效序列帧
│   ├── UI/kenney_ui-pack/    # UI 图片素材
│   └── bgm/                  # 音效/音乐
└── dist/                     # 构建输出
```
