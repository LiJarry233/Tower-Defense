# ============================================================================
# 游戏状态机 (Autoload Singleton)
# ============================================================================
extends Node

enum State {
    MENU,
    ARCHIVE,
    LEVEL_SELECT,
    PLAYING,
    PAUSED,
    VICTORY,
    DEFEAT
}

var current_state: State = State.PLAYING

# 对局数据
var current_level: int = 1
var gold: int = 0
var wall_hp: float = 10000.0
var enemies_killed: int = 0
var enemies_total: int = 0

# 玩家升级
var damage_level: int = 0
var cooldown_level: int = 0
var bullet_count_level: int = 0

# 炮台位
var turret_slot_0: int = -1  # -1=空, 0=普通, 1=范围
var turret_slot_1: int = -1

# 存档槽
var active_slot: int = -1
var save_data: Array = [{}, {}, {}]


func get_player_damage() -> float:
    return GameConfig.PLAYER_BASE_DAMAGE + damage_level * GameConfig.PLAYER_DAMAGE_PER_LV

func get_player_cooldown() -> float:
    var cd := GameConfig.PLAYER_BASE_COOLDOWN
    for _i in range(cooldown_level):
        cd *= GameConfig.PLAYER_CD_MULTIPLIER
    return cd

func get_player_bullet_count() -> int:
    return GameConfig.PLAYER_BASE_BULLETS + bullet_count_level

func reset_level_data():
    gold = 0
    wall_hp = GameConfig.WALL_MAX_HP
    enemies_killed = 0
    enemies_total = 0
