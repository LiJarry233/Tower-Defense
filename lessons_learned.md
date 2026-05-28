# 前两次路线失败总结 → Three.js 路线规划

## 失败点总结

### Raylib (C++) 失败点
1. **u16 索引限制** — 单 Mesh 最多 65535 顶点，wall.glb 16万顶点直接溢出损坏
2. **PBR 材质不完善** — glb 内嵌纹理无法正确映射到材质槽
3. **C++ 构建复杂** — assimp DLL 依赖链（6个），Windows 双击启动即崩
4. **Assimp Mesh 转换失败** — 顶点/索引/VAO 数据正确，但 DrawMesh 始终不渲染

### Godot 4.x 失败点
1. **AnimationPlayer root_node 断裂** — FBX 实例化后骨骼路径失效，编辑器能播、代码不行
2. **动画合并流程繁琐** — 3段动画需手动导入/保存/加载/重命名，极易出错
3. **编辑器+代码混合模式** — 手写 .tscn 格式不支持，必须在编辑器中操作，无法 AI 辅助批量生成
4. **严格类型 GDScript** — nullable 类型转换、类型推断等问题反复出现

### 核心教训
> **不要用需要"编辑器手动操作"的引擎**  
> **不要用对 glTF 支持不完善的渲染库**  
> **一切代码化，一切可控**


## Three.js 路线规划

### 为什么能成功
| 之前的问题 | Three.js 怎么解决 |
|------------|------------------|
| u16 索引溢出 | WebGL2 原生支持 u32，无限制 |
| PBR 贴图不显示 | GLTFLoader 是 Khronos 官方参考实现 |
| 动画导入复杂 | `gltf.animations[0]` 一行代码取动画 |
| 多动画切换 | `mixer.clipAction(clip).crossFadeTo()` |
| 编辑器依赖 | 零编辑器，全部代码驱动 |
| DLL/构建问题 | npm install + vite build，零依赖 |

### 技术栈
```
语言:       TypeScript
3D:         Three.js (WebGL2)
UI:         HTML + CSS (Kenney UI Pack 图片资源)
工具:       Vite (构建) + Electron (打包 Windows .exe)
物理:       three.js Raycaster + 手动 AABB/Sphere 碰撞
存档:       JSON (localStorage 或文件系统)
```

### 项目结构
```
TowerDefense/
├── assets/                    # 现有资源原封不动
│   ├── models/                # glb 模型
│   ├── UI/kenney_ui-pack/     # UI 图片
│   ├── ground-unity/          # 地面贴图
│   └── combat_magic_vfx/      # VFX 序列帧
├── src/
│   ├── main.ts                # 入口 + 游戏主循环
│   ├── scene.ts               # Three.js 场景初始化
│   ├── camera.ts              # 摄像机控制器
│   ├── player.ts              # 主角（射击逻辑）
│   ├── enemy.ts               # 怪物基类 + 动画状态机
│   ├── turret.ts              # 炮台系统
│   ├── bullet.ts              # 弹丸系统
│   ├── wall.ts                # 城墙
│   ├── wave.ts                # 波次管理器
│   ├── ui.ts                  # HUD / 菜单 / 弹窗
│   ├── save.ts                # 存档系统
│   └── config.ts              # 数值常量
├── index.html                 # 入口 HTML
├── electron.js                # Electron 主进程
├── package.json               # npm 配置
├── tsconfig.json
└── vite.config.ts
```

### 开发阶段

#### 阶段 1: 脚手架 + 场景 (30min)
- npm init + vite + three.js
- 加载 wall.glb、地面贴图、末日天空色调
- Camera3D 控制器 (WASD + 滚轮 + 右键)
- 验证所有模型加载正常

#### 阶段 2: 主角 + 射击 (1h)
- 加载主角模型到城墙上
- 鼠标射线投到地面瞄准
- 左键射击黄色子弹（Three.js 内置几何体）
- 冷却系统

#### 阶段 3: 敌人 + 动画 (2h)
- 加载怪物 glb（melee/ranged/tank/boss）
- AnimationMixer 播放 walk/attack/death 动画
- 敌人 AI 状态机（Walk → Attack → Death）
- 子弹碰撞检测（Raycaster + Box3）

#### 阶段 4: 系统层 (1h)
- 波次管理器
- 炮台系统（自动索敌 + 发射）
- 城墙血条 + 金币

#### 阶段 5: UI + 存档 (1h)
- HTML/CSS HUD（血条/金币/击杀）
- 主菜单 / 暂停 / 胜利 / 失败弹窗
- localStorage 存档

#### 阶段 6: 打磨 (1h)
- 粒子特效（序列帧动画）
- 音效
- Electron 打包 .exe

### 动画代码（核心优势）
```typescript
// 加载怪物模型 — GLTFLoader 一行搞定
const loader = new GLTFLoader();
loader.load('assets/models/monsters/monster1/walk.glb', (gltf) => {
  const model = gltf.scene;
  const mixer = new THREE.AnimationMixer(model);

  // 动画映射
  const actions = {
    walk: mixer.clipAction(gltf.animations[0]),
    attack: mixer.clipAction(gltf.animations[1]),
    death: mixer.clipAction(gltf.animations[2])
  };

  // 播放走路动画
  actions.walk.play();
});
```

### 关键优势总结
1. **AI 最熟悉的 3D 引擎** — 生成代码质量远高于 Godot/GDScript
2. **零编辑器** — 全部代码驱动，没有 UID/tscn/手动拖拽
3. **glTF 完美支持** — Khronos 官方 GLTFLoader
4. **热更新** — Vite HMR，改代码即时生效
5. **Electron 打包** — 用户双击 .exe 启动，无浏览器痕迹
