#pragma once

#include <string>
#include <vector>

// ============================================================================
// 游戏状态枚举
// ============================================================================
enum class GameState {
    MENU,           // 主菜单
    ARCHIVE,        // 存档选择界面
    LEVEL_SELECT,   // 关卡选择
    PLAYING,        // 对局中
    PAUSED,         // 暂停
    VICTORY,        // 胜利结算
    DEFEAT          // 失败结算
};

// ============================================================================
// 怪物类型
// ============================================================================
enum class EnemyType {
    MELEE_GRUNT,    // 近战小怪
    RANGED_GRUNT,   // 远程小怪
    TANK,           // 肉盾大怪
    BOSS            // 最终boss
};

// ============================================================================
// 炮台类型
// ============================================================================
enum class TurretType {
    NONE = -1,      // 空位
    NORMAL,         // 普通炮台
    AOE             // 范围炮台
};

// ============================================================================
// 子弹类型
// ============================================================================
enum class BulletType {
    PLAYER_BULLET,  // 主角子弹
    TURRET_BULLET,  // 炮台子弹
    EXPLOSIVE,      // 爆裂子弹（范围炮台/爆炸）
    ARROW,          // 远程小怪弓箭弹幕
    BOSS_ORB        // boss能量团
};

// ============================================================================
// 关卡定义
// ============================================================================
struct LevelDef {
    int meleeCount   = 0;
    int rangedCount  = 0;
    int tankCount    = 0;
    int bossCount    = 0;
};

// ============================================================================
// 玩家升级数据
// ============================================================================
struct PlayerUpgrades {
    int damageLevel       = 0;  // 伤害等级
    int cooldownLevel     = 0;  // 冷却等级
    int bulletCountLevel  = 0;  // 子弹数量等级
};

// ============================================================================
// 存档数据
// ============================================================================
struct SaveData {
    int slot            = 0;    // 存档槽 (0-2)
    int currentLevel    = 0;    // 当前关卡 (0=未开始, 1/2/3)
    PlayerUpgrades upgrades;
    int gold            = 0;
    float wallHP        = 10000.0f;
    bool turretPlaced[2] = {false, false};
    TurretType turretTypes[2] = {TurretType::NONE, TurretType::NONE};
};

// ============================================================================
// 游戏全局配置常量
// ============================================================================
namespace GameConfig {

    // --- 城墙 ---
    constexpr float WALL_MAX_HP   = 10000.0f;

    // --- 主角 ---
    constexpr float PLAYER_BASE_DAMAGE    = 100.0f;
    constexpr float PLAYER_BASE_COOLDOWN  = 0.5f;
    constexpr int   PLAYER_BASE_BULLETS   = 1;
    constexpr float PLAYER_DAMAGE_PER_LV  = 50.0f;
    constexpr float PLAYER_CD_MULTIPLIER  = 0.8f;    // 每级 ×0.8

    // --- 近战小怪 ---
    constexpr float MELEE_HP              = 400.0f;
    constexpr float MELEE_DAMAGE          = 100.0f;
    constexpr float MELEE_ATTACK_INTERVAL = 1.0f;
    constexpr int   MELEE_GOLD            = 10;

    // --- 远程小怪 ---
    constexpr float RANGED_HP              = 300.0f;
    constexpr float RANGED_DAMAGE          = 200.0f;
    constexpr float RANGED_ATTACK_INTERVAL = 2.0f;
    constexpr int   RANGED_GOLD            = 20;

    // --- 肉盾大怪 ---
    constexpr float TANK_HP              = 2000.0f;
    constexpr float TANK_DAMAGE          = 200.0f;
    constexpr float TANK_ATTACK_INTERVAL = 3.0f;
    constexpr int   TANK_GOLD            = 50;

    // --- 最终boss ---
    constexpr float BOSS_HP              = 4000.0f;
    constexpr float BOSS_DAMAGE          = 400.0f;
    constexpr float BOSS_ATTACK_INTERVAL = 3.0f;

    // --- 普通炮台 ---
    constexpr float NORMAL_TURRET_DAMAGE = 100.0f;
    constexpr float NORMAL_TURRET_CD     = 0.2f;
    constexpr int   NORMAL_TURRET_PRICE  = 500;

    // --- 范围炮台 ---
    constexpr float AOE_TURRET_DAMAGE    = 500.0f;
    constexpr float AOE_TURRET_CD        = 1.0f;
    constexpr int   AOE_TURRET_PRICE     = 1000;

    // --- 刷新间隔 ---
    constexpr float SPAWN_INTERVAL_MIN   = 0.0f;
    constexpr float SPAWN_INTERVAL_MAX   = 0.4f;

    // --- 关卡表 ---
    constexpr LevelDef LEVELS[] = {
        { 50, 10,  0, 0 },  // 第一关
        { 100, 20, 10, 0 },  // 第二关
        { 100, 40, 20, 1 }   // 第三关
    };

    constexpr int NUM_LEVELS = sizeof(LEVELS) / sizeof(LEVELS[0]);
    constexpr int MAX_SAVE_SLOTS = 3;

} // namespace GameConfig

// ============================================================================
// 全局游戏运行时状态（单例）
// ============================================================================
struct GameRuntime {
    GameState state = GameState::MENU;

    // 存档
    SaveData saves[GameConfig::MAX_SAVE_SLOTS];
    int activeSlot = -1;     // 当前使用的存档槽

    // 对局状态
    int currentLevel    = 1;
    int gold            = 0;
    float wallHP        = GameConfig::WALL_MAX_HP;
    int enemiesKilled   = 0;
    int enemiesTotal    = 0;

    PlayerUpgrades upgrades;

    // 炮台位
    TurretType turretSlots[2] = {TurretType::NONE, TurretType::NONE};
};
