# ============================================================================
# 游戏全局配置常量 (Autoload Singleton)
# ============================================================================
extends Node

# --- 城墙 ---
const WALL_MAX_HP: float = 10000.0

# --- 主角 ---
const PLAYER_BASE_DAMAGE: float = 100.0
const PLAYER_BASE_COOLDOWN: float = 0.5
const PLAYER_BASE_BULLETS: int = 1
const PLAYER_DAMAGE_PER_LV: float = 50.0
const PLAYER_CD_MULTIPLIER: float = 0.8

# --- 近战小怪 ---
const MELEE_HP: float = 400.0
const MELEE_DAMAGE: float = 100.0
const MELEE_ATTACK_INTERVAL: float = 1.0
const MELEE_GOLD: int = 10
const MELEE_SPEED: float = 2.0

# --- 远程小怪 ---
const RANGED_HP: float = 300.0
const RANGED_DAMAGE: float = 200.0
const RANGED_ATTACK_INTERVAL: float = 2.0
const RANGED_GOLD: int = 20
const RANGED_SPEED: float = 3.5

# --- 肉盾大怪 ---
const TANK_HP: float = 2000.0
const TANK_DAMAGE: float = 200.0
const TANK_ATTACK_INTERVAL: float = 3.0
const TANK_GOLD: int = 50
const TANK_SPEED: float = 1.5

# --- 最终Boss ---
const BOSS_HP: float = 4000.0
const BOSS_DAMAGE: float = 400.0
const BOSS_ATTACK_INTERVAL: float = 3.0
const BOSS_SPEED: float = 1.2

# --- 普通炮台 ---
const NORMAL_TURRET_DAMAGE: float = 50.0
const NORMAL_TURRET_CD: float = 0.4
const NORMAL_TURRET_PRICE: int = 500

# --- 范围炮台 ---
const AOE_TURRET_DAMAGE: float = 250.0
const AOE_TURRET_CD: float = 2.0
const AOE_TURRET_PRICE: int = 1000

# --- 刷新间隔 ---
const SPAWN_INTERVAL_MIN: float = 0.0
const SPAWN_INTERVAL_MAX: float = 0.4

# --- 关卡表 ---
const LEVELS: Array[Dictionary] = [
    {"melee": 50, "ranged": 10, "tank": 0,  "boss": 0},
    {"melee": 100, "ranged": 20, "tank": 10, "boss": 0},
    {"melee": 100, "ranged": 40, "tank": 20, "boss": 1},
]

const MAX_SAVE_SLOTS: int = 3
