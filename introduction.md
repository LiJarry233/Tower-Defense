# 代码实现详解 — 3D末日塔防

> 技术栈：TypeScript + Three.js + Vite  
> 源码总行数：~1400 行（12 个模块）

---

## 项目文件结构

```
src/
├── main.ts           # 入口：场景搭建 + 游戏主循环 + 输入控制 + 状态机 (480行)
├── config.ts         # 游戏数值常量表 (43行)
├── gamestate.ts      # 全局运行时状态 (13行)
├── player.ts         # 主角：模型加载、瞄准、射击 (82行)
├── enemy.ts          # 敌人：AI状态机、动画切换、攻击逻辑 (199行)
├── bullet.ts         # 弹丸：飞行、碰撞、AOE标记 (41行)
├── turret.ts         # 炮台：自动索敌、射击、模型加载 (80行)
├── ui.ts             # UI系统：菜单/存档/HUD/弹窗 (263行)
├── audio.ts          # 音效管理：Web Audio API 预加载 + 播放 (44行)
├── vfx.ts            # 粒子特效：爆炸、火花、消散 (67行)
├── save.ts           # 存档系统：localStorage 3槽位 JSON (41行)
└── hud.ts            # 旧版HUD（已被ui.ts替代，向后兼容） (46行)
```

---

## [src/main.ts](src/main.ts) — 入口与主循环

### 全局变量（场景层）
| 变量 | 类型 | 作用 |
|------|------|------|
| `renderer` | WebGLRenderer | Three.js 渲染器，设置抗锯齿/阴影/像素比 |
| `scene` | Scene | 根场景，含雾效和天空色 |
| `camera` | PerspectiveCamera | 透视摄像机，初始位于城墙后方俯视战场 |
| `camera` (控制) | — | WASD 平移、右键拖拽旋转、滚轮缩放 |

### 场景初始化（自动执行）
- `AmbientLight` + `DirectionalLight`（阴影贴图 1024²）
- `PlaneGeometry(600, 600)` 地面 + 荒地贴图（RepeatWrapping 30×30）
- `wallGroup` 加载 `wall.glb`（40x缩放，接收/投射阴影）
- 2个炮台白色光点（SphereGeometry + Raycaster 点击检测）
- 玩家模型（player.ts 管理）

### 波次管理器
- `startWave(level, reset)` — 读取 `LEVELS` 配置，初始化本关怪物计数
- `spawnEnemy(type, x, z)` — 生成单个敌人
- 主循环中每 1.5s 生成一个，直到总数达标

### UI状态流
```
MainMenu → ArchiveScreen → LevelSelect → PLAYING
                                       ↓ (P)
                                    PAUSED → 继续/退出
                                       ↓ (完)
                               VICTORY/DEFEAT → 重试/下一关/退出
```

### 关键函数
| 函数 | 作用 |
|------|------|
| `placeTurret(slot, pos, type)` | 在指定槽位放置炮台，替换旧炮台，隐藏光点 |
| `showPause()` | 创建暂停覆盖层，P 键切换继续/退出 |
| `showResult()` | 根据 victory/defeat 显示结算弹窗 |
| `toggleUpgradeUI()` | U 键开关升级面板，显示伤害/CD/费用 |

### 碰撞检测（主循环中）
1. 子弹 `Bullet.update(dt)` 移动
2. 每颗子弹遍历 `enemies` 数组，`distanceTo` < 5 触发命中
3. AOE 子弹额外溅射 10 单位内敌人（60%伤害）
4. 命中时调用 `spawnHitSpark` / `spawnExplosion`

### 音效初始化
- 首次点击页面 → `preloadSounds()` 异步加载8个MP3 → `startBGM()` 循环播放背景音乐

---

## [src/config.ts](src/config.ts) — 数值常量

所有游戏数值集中在此模块，无函数，全部为 `export const`。

```typescript
// 城墙
WALL_MAX_HP = 10000

// 主角
PLAYER_BASE_DAMAGE = 100, PLAYER_BASE_COOLDOWN = 0.5

// 四种怪物（HP/伤害/攻速/金币/速度）
MELEE_HP=400, RANGED_HP=300, TANK_HP=2000, BOSS_HP=4000

// 两种炮台
NORMAL_TURRET_DAMAGE=50, NORMAL_TURRET_CD=0.4, NORMAL_TURRET_PRICE=500
AOE_TURRET_DAMAGE=250, AOE_TURRET_CD=2.0, AOE_TURRET_PRICE=1000

// 关卡表
LEVELS = [
  { melee:50, ranged:10, tank:0, boss:0 },
  { melee:100, ranged:20, tank:10, boss:0 },
  { melee:100, ranged:40, tank:20, boss:1 },
]
```

---

## [src/gamestate.ts](src/gamestate.ts) — 全局状态

```typescript
Game = {
  wallHP, gold, kills, totalEnemies,  // 对局数据
  level,                              // 当前关卡 1/2/3
  state,                              // menu|playing|paused|victory|defeat
  playerLevel, playerDamage, playerCD // 升级属性
}
```

被所有模块直接引用（非单例，作为可变对象）。

---

## [src/player.ts](src/player.ts) — 主角系统

### `class Player`
| 成员 | 类型 | 作用 |
|------|------|------|
| `model` | Group | 玩家根节点（位置 (0,12,-28) 城墙顶部） |
| `mixer` | AnimationMixer | Gunplay.fbx 动画混合器 |
| `cooldown` | number | 射击冷却计时器 |
| `shootDir` | Vector3 | 当前瞄准方向 |

### 构造函数
`FBXLoader.load("Gunplay.fbx")` → 缩放 5x → 创建 `AnimationMixer` → 循环播放第一个动画

### `update(dt)`
1. 获取鼠标位置 → `Raycaster` 投射到 y=0 地面平面
2. `model.lookAt(hit)` 转身瞄准
3. 缓存 `shootDir` 供射击使用

### `tryShoot()`
- 冷却未到返回 false
- 发射一颗黄色发光圆柱子弹（Bullet 类）
- 播放 `fire.mp3` 音效

---

## [src/enemy.ts](src/enemy.ts) — 敌人系统

### 模型缓存 `loadOne(path, cb)`
- Map 缓存已加载 FBX/GLB
- 命中缓存时用 `SkeletonUtils.clone()`（正确克隆骨骼+皮肤+动画）
- 新加载时存储 `{ group, clips }`，clone 后手动赋值 `clone.animations`

### `interface TypeCfg`
每种敌人类型的完整配置：
```typescript
{
  hp, speed, damage, cd, gold, range, scale,  // 数值
  models: { walk, attack, death },             // 3段动画文件路径
  movement: "stopgo" | "continuous",           // 移动模式
  stepDist                                     // stopgo每步距离
}
```

### `CFG` 配置表
| 类型 | 移动 | 步距 | 攻击距离 | 缩放 | 动画文件 |
|------|------|------|----------|------|----------|
| melee | stopgo | 4.5 | 5 | 5 | Zombie Running/Punching/Death.fbx |
| ranged | continuous | — | 30 | 5 | Walking.fbx / Shooting Arrow.fbx / Standing React Death.fbx |
| tank | stopgo | 3 | 5 | 0.05 | Walking.fbx / Attack.fbx / Death.fbx |
| boss | continuous | — | 30 | 10 | Run Forward.fbx / Magic Attack.fbx / Falling Forward Death.fbx |

### `class Enemy`
| 方法 | 作用 |
|------|------|
| `constructor(type, pos)` | 加载3段模型 → 创建Mixer/Action → 全部加载完后显示 |
| `_switchTo(key)` | 切换状态：隐藏其他模型 → 显示目标模型 → `reset().play()` 重播动画 |
| `update(dt)` | 只更新当前状态mixer → 距离判断 → stopgo循环跃进/continuous平滑移动 → 攻击计时 |
| `takeDamage(dmg)` | 扣血 → 死亡时加金币/kills → 播放death模型 → delay 800ms后dispose |
| `dispose()` | 从场景移除 → 释放geometry/material |

### stopgo 移动模式
跟踪 `AnimationAction.time`：当 `time < prevTime` 表示动画循环完成 → 向城墙跃进 `stepDist` 单位 → `lookAt(wallTarget)`

---

## [src/bullet.ts](src/bullet.ts) — 弹丸系统

### `class Bullet`
| 属性 | 作用 |
|------|------|
| `mesh` | CylinderGeometry 黄色发光圆柱 + 材质 |
| `velocity` | 方向 × 速度 |
| `damage` | 命中伤害值 |
| `isAOE` | 是否溅射（范围炮台子弹） |
| `dead` | 标记待回收 |
| `_life` | 存活时间（5秒后自动消失） |

### `constructor(origin, dir, speed, dmg, color, emissive, aoe)`
创建圆柱几何体 → 旋转90度横放 → 设置方向/速度/伤害 → 添加到 scene

### `update(dt)`
- `life -= dt`，≤0 则 `dispose()`
- `position += velocity * dt`
- 遍历 `enemy` group 节点 → 距离 < 8 触发 `enemy.hit(damage)` → `dispose()`

### `dispose()`
从 scene 移除 → 释放 geometry/material

---

## [src/turret.ts](src/turret.ts) — 炮台系统

### `class Turret`
| 属性 | 作用 |
|------|------|
| `type` | 0=普通（蓝色）/ 1=范围（橙色） |
| `model` | GLB 模型节点（tower1.1.glb 或 tower2.glb） |
| `cooldown` | 射击冷却计时器 |
| `built` | 模型是否加载完成（加载完成前不攻击） |

### `constructor(type, pos)`
GLTFLoader.load 对应模型 → 缩放 1.5x → 设置阴影

### `update(dt, enemies)`
1. 冷却计时
2. 遍历敌人找最近（distanceTo < 60）
3. `lookAt` 瞄准
4. 创建 Bullet（AOE 橙色爆炸子弹 / 普通青色子弹）
5. 播放 `fire.mp3`
6. 子弹通过 `import("./main")` 动态导入添加到全局 bullets 数组

---

## [src/ui.ts](src/ui.ts) — UI 系统

### 工具函数
| 函数 | 作用 |
|------|------|
| `el(tag, style, inner)` | 创建 HTML 元素并设置样式 |
| `kenneyBtn(text, color, cb)` | Kenney UI Pack 按钮（Grey/Double/button_rectangle_depth_gradient.png） |
| `kenneyPanel(w, h)` | Kenney 纹理面板（button_rectangle_depth_flat.png） |

### `class Overlay`（基类）
- 全屏半透明黑色遮罩
- `show()` / `hide()` 控制显示

### `class Hud`
- 城墙血条（动态宽度 + 颜色：绿→橙→红）
- 金币数（Kenney star 图标）
- 击杀进度 `Kills: X/Y`
- 玩家等级 `Player Lv.X | U=升级`

### `class MainMenu` → Overlay
- 标题"末日塔防" + "Tower Defense"
- [开始游戏] 按钮 → `onStart` 回调

### `class ArchiveScreen` → Overlay
- 3 个存档槽，每个显示：存档名/关卡/金币 + [读取] [删除] + [返回]
- `refresh()` 从 localStorage 读取并更新显示

### `class LevelSelect` → Overlay
- 3 个关卡按钮（显示怪物总数）
- [返回] 按钮

### `class PauseOverlay` → Overlay
- "PAUSED" 标题
- [继续]（恢复 playing）/ [退出]（返回关卡选择）

### `class ResultOverlay` → Overlay
- **胜利**：绿色"胜利！" + [下一关]（不显示在第三关）+ [退出]
- **失败**：红色"失败" + [重试]（读档重置）+ [退出]

### `class TurretShop` → Overlay
- [普通炮台 500g] / [范围炮台 1000g] / [返回]

---

## [src/audio.ts](src/audio.ts) — 音效管理

### `preloadSounds()`
异步加载 8 个 MP3 文件（bgm, fire, bomb, equipment, leve_up, attatchment, far_attatchment, normaldeath）→ 解码为 AudioBuffer → 存入 Map 缓存

### `playSound(name, loop, volume)`
从缓存取 AudioBuffer → 创建 BufferSource → 连接到 GainNode → 播放

### `startBGM()` / `stopBGM()`
控制背景音乐循环播放/停止

### 音效映射
| 事件 | 音效文件 |
|------|----------|
| 背景音乐 | bgm.mp3（循环） |
| 主角/炮台射击 | fire.mp3 |
| AOE 爆炸 | bomb.mp3 |
| 购买炮台 | equipment.mp3 |
| 升级 | leve_up.mp3 |
| 近战/肉盾攻击 | attatchment.mp3 |
| 远程/Boss攻击 | far_attatchment.mp3 |
| 怪物死亡 | normaldeath.mp3 |

---

## [src/vfx.ts](src/vfx.ts) — 粒子特效

### `spawnExplosion(pos: Vector3)`
AOE 爆炸：橙色球体 → 每秒膨胀 15 倍 → 透明度 1.2/秒 淡化 → 0.8s 后释放

### `spawnHitSpark(pos: Vector3)`
命中火花：8 个黄色小球 → 随机方向 8 速度飞行 → 受重力（-3/s）→ 0.5s 后消失

### `spawnDissipate(model: Group, cb)`
消散：模型缩放每秒线性减少 → 0.6s 后缩放为 0 → 回调 dispose

---

## [src/save.ts](src/save.ts) — 存档系统

### `SaveSlot` 接口
```typescript
{
  level: number;      // 当前关卡
  gold: number;       // 金币
  wallHP: number;     // 城墙血量
  kills, total;       // 击杀进度
  turrets: number[];  // 炮台类型 [-1=空, 0=普通, 1=范围]
}
```

### 函数
| 函数 | 作用 |
|------|------|
| `saveGame(slot)` | JSON.stringify → localStorage `td_save_{slot}` |
| `loadGame(slot)` | 读取 + JSON.parse，不存在返回 null |
| `deleteSave(slot)` | localStorage.removeItem |
| `getSaveInfo(slot)` | 返回 `{ exists, level, gold }` 用于存档界面显示 |

---

## 运行时流程图

```
animate() 每帧:
  1. WASD移动摄像机 → lookAt(camPivot)
  2. 检查Game.state → menu/paused则跳过游戏逻辑
  3. player.update(dt)      → 瞄准 + 射击检测
  4. waveManager.spawn      → 生成敌人
  5. turrets[i].update()    → 索敌 + 发射
  6. enemies[i].update()    → 移动 + 攻击
  7. bullets[i].update()    → 飞行 + 碰撞检测
  8. 胜利/失败检测           → showResult()
  9. hud.update()           → 刷新HUD
  10. renderer.render()
```

---

## 关键设计决策

### 模型Cache + Clone
加载过的FBX/GLB存入Map缓存，后续克隆复用。使用 `SkeletonUtils.clone()` 而非 `Object3D.clone()`——前者正确复制骨骼树+皮肤引用+动画clip。

### 只更新活跃Mixer
每个敌人有3个AnimationMixer（walk/attack/death），但每帧只更新当前状态的那个——3倍性能提升。

### 音效预加载
所有MP3在首次点击时一次性fetch→decode→缓存，后续`playSound()`从内存取AudioBuffer，零延迟。

### UI全HTML/CSS
不使用Three.js做3D UI——HTML元素叠加在canvas上方，用Kenney PNG做按钮/面板纹理，CSS控制布局和交互。
