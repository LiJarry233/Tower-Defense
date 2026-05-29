# Tower Defense — 3D末日塔防

## 项目背景

一款 3D 末日题材塔防游戏。玩家站在城墙上，抵御源源不断的怪物进攻，保护城墙不被攻破。游戏包含 3 个关卡、4 种怪物（近战小怪/远程小怪/肉盾大怪/Boss）、2 种炮台（普通/范围）、主角升级系统、完整的 UI 流程（主菜单→读档→关卡选择→对局→结算）以及音效/音乐系统。

本项目经历三次技术栈迭代（raylib → Godot → Three.js），最终选型完成。

---

## 玩法说明

### 游戏目标
保护城墙（HP 10000）不被怪物摧毁。消灭当前关卡所有怪物即为胜利。

### 敌我双方
| 角色 | 攻击距离 | 移动模式 | 说明 |
|------|---------|----------|------|
| **主角** | 无限（瞄准） | 固定城墙顶部 | 鼠标瞄准 + 左键射击。按 U 升级面板 |
| **城墙** | — | — | HP 10000，归零则失败 |
| **近战小怪** | 5 单位 | 停-走 4.5/步 | 动画循环完向前跃进 |
| **远程小怪** | 30 单位 | 持续移动 | 距墙 30 单位停下，远程射击 |
| **肉盾大怪** | 5 单位 | 停-走 12/步 | 高血量，动画慢放 0.125× |
| **Boss** | 30 单位 | 持续移动 | 距墙 30 单位停下，魔法攻击，动画慢放 0.5× |

### 炮台系统
- 城墙上两个固定点位（x=±32, y=17）
- 点击光点 → 弹出购买面板
- **普通炮台** 500g：tower1.1.glb 模型，自动索敌，青色子弹
- **范围炮台** 1000g：tower2.glb 模型，自动索敌，橙色爆炸子弹（溅射伤害 60%）

### 主角升级
- 按 U 打开升级面板
- 初始 Lv.1：伤害 100，冷却 0.5s
- 每级：伤害 +100，冷却 -0.1s
- 费用递增：Lv1→Lv2: 200g，Lv2→Lv3: 500g，Lv3→Lv4: 800g...（每级 +300g）

### 关卡数据（3关）
| 关卡 | 近战 | 远程 | 肉盾 | Boss | 总计 |
|------|------|------|------|------|------|
| 1 | 25 | 5 | 0 | 0 | 30 |
| 2 | 50 | 10 | 5 | 0 | 65 |
| 3 | 50 | 20 | 10 | 5 | 85 |

- 怪物刷新间隔：2 秒/个，距城墙 70~200 单位
- 金币掉落 ×2（20/40/100）

### 存档系统
- 3 个存档槽，localStorage JSON 存储
- 保存关卡进度、金币、城墙血量、炮台、玩家升级属性
- 支持读取和删除

---

## 控制说明

| 操作 | 按键 |
|------|------|
| 移动视角 | WASD / 方向键 |
| 旋转视角 | 鼠标右键拖拽 |
| 缩放 | 鼠标滚轮 |
| 射击 | 鼠标左键 |
| 暂停/继续 | P |
| 升级面板 | U |
| 金币 +1000 | M（调试） |
| 购买炮台 | 点击城墙上白色光点 |

---

## 怪物动画与速度

| 类型 | 模型 | 行走 | 攻击 | 死亡 | 动画倍速 | 移动速度 |
|------|------|------|------|------|----------|----------|
| 近战 | Zombie Running/Punching/Death.fbx | 停-走 4.5u | 攻击动画 | 死亡动画 | 0.75× | 5.0 |
| 远程 | Walking.fbx / Shooting Arrow.fbx / Standing React Death.fbx | 持续 | 射击动画 | 死亡动画 | 1× | 3.5 |
| 肉盾 | Walking.fbx / Attack.fbx / Death.fbx | 停-走 12u | 攻击动画 | 死亡动画 | 0.125× | — |
| Boss | Run Forward.fbx / Magic Attack.fbx / Falling Forward Death.fbx | 持续 | 魔法动画 | 死亡动画 | 0.5× | 1.8 |

---

## 音效系统

| 事件 | 音效文件 |
|------|----------|
| 背景音乐 | `/bgm/bgm.mp3`（循环） |
| 主角/炮台射击 | `/bgm/fire.mp3` |
| AOE 爆炸 | `/bgm/bomb.mp3` |
| 购买炮台 | `/bgm/equipment.mp3` |
| 升级 | `/bgm/leve_up.mp3` |
| 近战/肉盾攻击 | `/bgm/attatchment.mp3` |
| 远程/Boss 攻击 | `/bgm/far_attatchment.mp3` |
| 怪物死亡 | `/bgm/normaldeath.mp3` |

---

## 技术栈抉择

### 第一代：C++ + raylib
- **放弃原因**：u16 索引限制（16 万顶点模型溢出）、PBR 管线不完善、assimp 转换渲染失败

### 第二代：Godot Engine 4.x
- **放弃原因**：AnimationPlayer 实例化后 root_node 断裂（编辑器能播、代码不能）、动画合并流程繁琐、编辑器依赖无法 AI 辅助

### 第三代：Three.js + TypeScript + Vite（当前）
- **选择原因**：Khronos 官方 GLTFLoader（完美 glTF 支持）、AnimationMixer API 可靠、全部代码驱动零编辑器、AI 高度可辅助、Web Audio API 零依赖音效

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
│   ├── main.ts               # 场景初始化 + 主循环 + 输入 + 状态机
│   ├── config.ts             # 数值常量
│   ├── gamestate.ts          # 全局游戏状态
│   ├── player.ts             # 主角（瞄准、射击）
│   ├── bullet.ts             # 弹丸系统
│   ├── enemy.ts              # 敌人（AI + 动画状态机）
│   ├── turret.ts             # 炮台（自动索敌 + 模型）
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
