extends Node3D

var hp: float = GameConfig.WALL_MAX_HP


func take_damage(dmg: float):
    hp -= dmg
    if hp <= 0:
        hp = 0
        GameState.current_state = GameState.State.DEFEAT


func get_hp_ratio() -> float:
    return hp / GameConfig.WALL_MAX_HP
