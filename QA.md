# 路演 Q&A 文档 — 3D末日塔防

---

## 一、技术栈与架构

### Q1：为什么经历了四次技术栈切换？
我们最早想用 **Unity + C#**，但开发机装不上 Unity 引擎，一行代码没写就放弃了。接着试了 **C++ + raylib**，基本完成了代码，但遇到了致命问题：raylib 只支持 16 位索引（每个 Mesh 最多 65535 个顶点），而我们的 wall.glb 就有 16 万顶点——索引直接溢出，模型损坏。用了 assimp 做模型预处理，Mesh 数据导入正确但始终不渲染。

然后切换到 **Godot 4.x**，场景搭建很顺利，但运行时 AnimationPlayer 的骨骼路径会断裂——编辑器中能播放动画，代码里不行。加上 Godot 的 .tscn 格式必须手动在编辑器中操作，AI 无法辅助，效率太低。

最终选择了 **TypeScript + Three.js**：GLTFLoader 是 Khronos 官方参考实现，完美支持高面模型和骨骼动画，全部代码 1400 行覆盖所有功能，AI 全程可辅助。

### Q2：为什么要全部代码驱动，不用可视化编辑器？
三次失败给了我们一个核心教训：**凡是需要手动在编辑器中操作的部分，AI 都无法参与**。Godot 的 UID/tscn 格式要求场景必须在 GUI 中创建；而 Three.js 的场景、模型、动画、UI 全部用代码控制——每一行都可以被 AI 理解、生成、修改。这不是"对抗编辑器"，而是**让 AI 成为开发工具链的一环**。

### Q3：为什么要在一个 3D 塔防游戏里用 Web 技术？
Web 技术栈有一个其他路线无法替代的优势：**单次加载、秒级热更新、零依赖地狱**。C++/raylib 阶段 assimp 的 6 个 DLL 依赖链让双击 .exe 就崩溃；Godot 的 .import 文件让版本管理混乱。而 `npm install` 一个命令解决所有依赖，Vite 改一行代码 50ms 热更新，构建输出就是纯静态文件。

### Q4：你们的游戏到底是浏览器游戏还是桌面游戏？
开发阶段是 **Web-based WebGL Game**——浏览器里运行，`npm run dev` 启动 Vite 开发服务器。部署时用 Electron 打包——把 Chromium 内核 + 构建产物封装成 .exe，双击启动，对用户来说就是一个桌面应用。VSCode、Discord、Figma 都是用同样的方式。

---

## 二、关键功能实现

### Q5：骨骼动画是怎么实现的？为什么之前一直失败？

**raylib 阶段**：内置的 cgltf 加载器把 glb 的 32 位索引强转为 16 位，超过 65535 的顶点全部损坏。assimp 重写了加载器但 Mesh 转 raylib 结构后渲染不通过。

**Godot 阶段**：FBX 场景实例化后，AnimationPlayer 的 `root_node` 默认指向父节点而非模型根节点，导致骨骼目标路径 `Skeleton3D:mixamorig_Hips` 解析失败。

**Three.js 阶段（成功方案）**：
1. FBXLoader 加载模型 → 拿到 `group.animations`（动画 clip 数组）
2. 创建 `AnimationMixer(group)` → `mixer.clipAction(animations[0])` 创建动作
3. `action.setLoop(LoopRepeat).play()` 循环播放
4. 每帧 `mixer.update(dt)` 驱动骨骼变换
5. 模型缓存 + 克隆用 `SkeletonUtils.clone()` 而非 `Object3D.clone()`——前者正确复制骨骼树和皮肤引用

```typescript
// 核心动画代码 (src/enemy.ts)
const mixer = new THREE.AnimationMixer(fbx);
const action = mixer.clipAction(fbx.animations[0]);
action.setLoop(THREE.LoopRepeat, Infinity);
action.timeScale = this.cfg.animSpeed;  // 控制播放速度
action.play();
```

### Q6：三种移动模式（stopgo vs continuous）有什么区别？
- **continuous**（远程/Boss）：每帧 `position += dir * speed * dt` 平滑移动，到达攻击距离后停下播放攻击动画
- **stopgo**（近战/肉盾）：原地循环播放走路动画，检测 `action.time < prevTime` 说明完成一个动画循环 → 向前跃进 `stepDist` 单位。这种模式的视觉特点是"走走停停"，有节奏感
- 两种模式共用同一个 AI 状态机：`walk → attack → death`

```typescript
// stopgo 的核心：检测动画循环回绕
const t = action.time;
if (t < this.prevAnimTime) {         // 时间回绕 = 动画完成一轮
    position.addScaledVector(dir, stepDist);  // 向前跃进
    lookAt(wallTarget);                       // 重新朝向城墙
}
this.prevAnimTime = t;
```

### Q7：模型是怎么缓存的？为什么不能直接 clone？
每个敌人需要 3 个模型（walk/attack/death），50 个敌人 = 150 次 FBX 加载。我们用了 **Map 缓存**——每个文件只加载一次，后续 `SkeletonUtils.clone()` 复制。

普通 `Object3D.clone(true)` 克隆骨骼模型时会丢失动画数据（clone 不复制 `.animations` 数组），且骨骼和皮肤的引用会错乱。`SkeletonUtils.clone()` 是 Three.js 官方提供的骨骼安全克隆函数，正确复制了 bone 层级、skinned mesh 引用和动画 clip。

```typescript
// 缓存逻辑 (src/enemy.ts)
const cache = new Map<string, { group, clips }>();

function loadOne(path, cb) {
  if (cache.has(path)) {
    const { group, clips } = cache.get(path);
    const clone = SkeletonUtils.clone(group);  // 骨骼安全克隆
    clone.animations = clips;                   // 手动恢复动画数据
    cb(clone);
    return;
  }
  fbxLoader.load(path, (g) => {
    cache.set(path, { group: g, clips: g.animations.slice() });
    cb(SkeletonUtils.clone(g));
  });
}
```

### Q8：UI 系统是怎么做的？为什么不用 Three.js 的 CSS2DRenderer 或 raygui？
我们直接在 Three.js 画布上方叠加纯 HTML/CSS 元素。原因很简单：
- HTML/CSS 是每个开发者最熟悉的 UI 技术，无需额外框架
- Kenney UI Pack 的 PNG 作为 `backgroundImage` 直接使用
- CSS `flexbox` 布局天然响应式，不需要手动计算像素坐标
- 存档选择、关卡选择、暂停弹窗、购买面板、升级面板全部是同一个模式：`Overlay` 基类（全屏半透明遮罩）→ `kenneyPanel()` 创建面板 → `kenneyBtn()` 创建按钮

### Q9：音效系统需要什么依赖？怎么做到零延迟播放？
**零外部依赖**，全部使用浏览器内置的 **Web Audio API**：
1. 首次点击页面时，`preloadSounds()` fetch 8 个 MP3 → `decodeAudioData()` 解码为 AudioBuffer → 存入 Map
2. 后续 `playSound(name)` 从内存取 AudioBuffer → `createBufferSource()` → `connect(gain).connect(destination)` → `start()`
3. 从解码后的内存数据播放，**零 I/O 延迟**

```
预加载流程: fetch MP3 → arrayBuffer → decodeAudioData → Map<name, AudioBuffer>
播放流程:   createBufferSource → 绑定 AudioBuffer → GainNode → destination → start()
```

### Q10：碰撞检测是怎么做的？为什么不用物理引擎？
碰撞检测用简单的 **距离判断**：
```typescript
// 子弹 vs 敌人 (src/main.ts)
for (const enemy of enemies) {
    if (enemy.dead) continue;
    const dist = bullet.mesh.position.distanceTo(enemy.model.position);
    if (dist < 8) {                    // 间距 < 8 单位 = 命中
        enemy.takeDamage(bullet.damage);
        if (bullet.isAOE) {            // 范围炮台溅射
            for (const other of enemies) {
                if (other.model.position.distanceTo(enemy.model.position) < 10) {
                    other.takeDamage(bullet.damage * 0.6);  // 60%溅射伤害
                }
            }
        }
    }
}
```

为什么不用物理引擎？塔防游戏不需要真实的碰撞响应（子弹击中敌人不需要弹开），只需要判断"是否够近"。距离判断足够快、不引入额外依赖。

### Q11：存档系统是怎么实现的？用了什么格式？
**localStorage + JSON**。三个存档槽，键名为 `td_save_0/1/2`，保存结构：

```typescript
{
  level, gold, wallHP, kills, total,
  turrets: [type0, type1],          // -1=空, 0=普通, 1=范围
  playerLevel, playerDamage, playerCD  // 升级状态
}
```

- `saveGame(slot)`: `JSON.stringify()` → `localStorage.setItem()`
- `loadGame(slot)`: `getItem()` → `JSON.parse()`，不存在返回 null
- 胜利/失败时自动存档

### Q12：为什么战斗画面里角色面朝方向有时会错？
两个原因：
1. FBX 模型的初始朝向不一致（不同 Mixamo 文件的基础朝向不同）
2. stopgo 敌人只在其动画循环回绕时才调用 `lookAt()`，第一圈会面朝错误方向

修复：构造函数中 `this.model.lookAt(this.wallTarget)` 设置初始朝向。战斗过程中，stopgo 每次跃进步也调用 `lookAt()`，continuous 每帧调用。

### Q13：不同怪物类型之间动画速度是怎么调整的？
通过 `AnimationAction.timeScale` 属性：
- 近战：0.75×（稍慢）
- 肉盾：0.125×（极慢，有压迫感）
- Boss：0.5×（缓慢，增强威严感）

这比调整 `dt` 或 `speed` 更精确——只影响动画播放速度，不影响移动速度。

### Q14：如何调试性能问题？做了哪些优化？
- **只更新活跃 mixer**：每个敌人有 3 个 AnimationMixer，但每帧只更新当前状态那个，2/3 的计算省掉了
- **模型缓存 + 克隆**：同一个 FBX 文件只加载一次，后续 clone 复用
- **SkeletonUtils.clone**：比 `Object3D.clone(true)` 在骨骼克隆上更高效
- **距离剔除**：敌人 spawning 距离 70~200 单位，太远不会被玩家看到
- **取消 console.log**：状态切换时不再打印日志到控制台
- 死亡动画用 `setTimeout` 替代 `requestAnimationFrame` 循环，减少 RAF 调用数

---

## 三、开发流程

### Q15：你们用 AI 写了多少代码？
1400 行 TypeScript 中，AI 完成了大约 90% 的骨架代码——包括所有类的结构、函数签名、API 调用模式。人工做的主要是：数值平衡调整（各种速度/伤害/缩放反复微调）、特定 bug 修复（骨骼克隆、动画切换、level 显示）、模型路径配置以及音效文件映射。简言之：**AI 写架子，人调细节**。

### Q16：开发过程中最困难的 bug 是什么？
**骨骼动画不播放**。这个问题在 raylib、Godot、Three.js 三个阶段各出现一次，但原因完全不同：
- raylib：u16 索引溢出导致 Mesh 损坏
- Godot：AnimationPlayer root_node 路径断裂
- Three.js：`Object3D.clone()` 不复制 `.animations` 且破坏骨骼-皮肤关系（最终换成 `SkeletonUtils.clone()` 解决）

另一个反复出现的问题是**文件编辑时的 tab/space 编码差异**，导致 edit 操作经常失败——这实际上是 AI 工具与手动编辑混合开发的常见痛点。

### Q17：为什么选择 TypeScript 而不是 JavaScript？
TypeScript 的类型系统让我们在编译时就发现了大量低级错误——参数类型不匹配、属性名拼写错、null 值未处理等。对于一个 AI 生成代码比例很高的项目，类型检查尤其重要：AI 偶尔会写出类型不兼容的代码，TS 编译器直接拦截，不会等到运行时才崩溃。

### Q18：如果让你重新做这个项目，你会怎么做？
1. 直接用 Three.js，跳过 raylib 和 Godot 的尝试——这两条路线共浪费了一周时间
2. 从一开始就用 SkeletonUtils.clone() 做模型缓存，避开 Object3D.clone() 的坑
3. 先用简单的彩色方块代替模型调试游戏逻辑，逻辑跑通后再加载高精度模型——避免同时调试渲染和游戏逻辑
4. 数值平衡放在最后做，先把功能跑通，最后统一调参

---

## 四、场景与交互

### Q19：摄像机控制怎么做的？为什么不用轨道控制器？
Three.js 内置的 OrbitControls 是为查看单个物体设计的（围绕原点旋转）。我们需要的是类似 RTS 游戏的**俯视平移视角**，所以手写了一个简单的控制器：

```typescript
// 平移: WASD 移动 camera.position 和 camPivot
// 缩放: 滚轮调整 camera 到 pivot 的距离 (5~150)
// 旋转: 右键拖拽，球坐标旋转 camera 绕 pivot
// 限制: camera.position.y 不能低于 0（不穿过地面）
```

### Q20：鼠标瞄准地面是怎么实现的？
**Raycaster + 平面求交**（[src/player.ts:54](src/player.ts#L54)）：
1. 获取鼠标在屏幕上的归一化坐标 (-1 ~ 1)
2. `camera.project_ray_origin(mouse)` 发射射线
3. 与 y=0 水平面求交：`t = -from.y / dir.y`
4. 交点 = `from + dir * t` → 瞄准点
5. 子弹方向 = `(aimPoint - player.position).normalize()`

---

## 五、扩展性

### Q21：如果要加第四关，需要改哪些地方？
只需修改 `src/config.ts` 中的 `LEVELS` 数组，加一行 `{ melee: X, ranged: X, tank: X, boss: X }`。关卡选择 UI 会自动多显示一个按钮。**不涉及任何运行时代码修改**。

### Q22：如果要加新类型怪物，需要改哪些地方？
1. `src/config.ts` 添加属性常量（HP/伤害/速度等）
2. `src/enemy.ts` 的 `CFG` 表添加对应配置项（模型路径、动画倍速、移动模式、步距）
3. WaveManager 会按关卡配置自动生成新类型

### Q23：如果要换 UI 风格，需要改哪些地方？
UI 纹理集中在 `src/ui.ts` 的 `KENNEY` 路径常量，改掉这个常量，所有按钮和面板的背景纹理都会切换。CSS 颜色/字体在 `el()` 函数的 `style` 参数中控制。**不需要动 HTML 结构**。
