extends Node3D

const EnemyScript = preload("res://scripts/enemy_simple.gd")

var _spawn_timer: float = 0.0
var _counts: Dictionary = {}
var _remaining: Dictionary = {}
var _all_spawned: bool = false
var _types: Array[String] = ["melee"]


func start_level(level: int):
    var data: Dictionary = GameConfig.LEVELS[level - 1]
    _counts["melee"] = data["melee"]
    _counts["ranged"] = data["ranged"]
    _counts["tank"] = data["tank"]
    _counts["boss"] = data["boss"]

    for key in _counts:
        _remaining[key] = _counts[key]
        if _counts[key] > 0:
            _types.append(key)

    GameState.enemies_total = _total_enemies()
    GameState.enemies_killed = 0
    GameState.wall_hp = GameConfig.WALL_MAX_HP
    _all_spawned = false


func _total_enemies() -> int:
    var t: int = 0
    for key in _counts:
        t += _counts[key]
    return t


func _remaining_total() -> int:
    var t: int = 0
    for key in _remaining:
        t += _remaining[key]
    return t


func _process(delta: float):
    # 胜利检测：全部生成 + 场上无敌人才算赢
    if _all_spawned and get_tree().get_nodes_in_group("enemy").is_empty():
        GameState.current_state = GameState.State.VICTORY
        _all_spawned = false  # 防止重复触发
        return

    _spawn_timer -= delta
    if _spawn_timer > 0:
        return
    _spawn_timer = randf_range(0.2, 0.6)

    # 随机选一种还有剩余的敌人类型
    var available: Array[String] = []
    for key in ["melee", "ranged", "tank", "boss"]:
        if _remaining.get(key, 0) > 0:
            available.append(key)

    if available.is_empty():
        _all_spawned = true
        return

    var etype: String = available[randi() % available.size()]
    _remaining[etype] -= 1
    _spawn_one(etype)


func _spawn_one(etype: String):
    var enemy := Node3D.new()
    enemy.set_script(EnemyScript)
    enemy.name = "Enemy_" + etype

    var stats := _stats_for(etype)
    for key in stats:
        enemy.set(key, stats[key])

    var x := randf_range(-30, 30)
    var z := randf_range(40, 70)
    enemy.position = Vector3(x, 0, z)

    get_parent().add_child(enemy)


func _stats_for(etype: String) -> Dictionary:
    match etype:
        "melee":
            return {"hp": GameConfig.MELEE_HP, "speed": GameConfig.MELEE_SPEED,
                    "damage": GameConfig.MELEE_DAMAGE, "attack_cd": GameConfig.MELEE_ATTACK_INTERVAL,
                    "gold": GameConfig.MELEE_GOLD, "attack_range": 2.5,
                    "model_walk": "res://Zombie Death.fbx",
                    "model_attack": "res://Zombie Death.fbx",
                    "model_death": "res://Zombie Death.fbx"}
        "ranged":
            return {"hp": GameConfig.RANGED_HP, "speed": GameConfig.RANGED_SPEED,
                    "damage": GameConfig.RANGED_DAMAGE, "attack_cd": GameConfig.RANGED_ATTACK_INTERVAL,
                    "gold": GameConfig.RANGED_GOLD, "attack_range": 15.0,
                    "model_walk": "res://assets/models/monsters/monster2/walk.glb",
                    "model_attack": "res://assets/models/monsters/monster2/shoot.glb",
                    "model_death": "res://assets/models/monsters/monster2/death.glb"}
        "tank":
            return {"hp": GameConfig.TANK_HP, "speed": GameConfig.TANK_SPEED,
                    "damage": GameConfig.TANK_DAMAGE, "attack_cd": GameConfig.TANK_ATTACK_INTERVAL,
                    "gold": GameConfig.TANK_GOLD, "attack_range": 3.0,
                    "model_walk": "res://assets/models/monsters/monster3/walk.glb",
                    "model_attack": "res://assets/models/monsters/monster3/attack.glb",
                    "model_death": "res://assets/models/monsters/monster3/death.glb"}
        "boss":
            return {"hp": GameConfig.BOSS_HP, "speed": GameConfig.BOSS_SPEED,
                    "damage": GameConfig.BOSS_DAMAGE, "attack_cd": GameConfig.BOSS_ATTACK_INTERVAL,
                    "gold": 0, "attack_range": 18.0,
                    "model_walk": "res://assets/models/Boss/boss.glb",
                    "model_attack": "res://assets/models/Boss/boss.glb",
                    "model_death": "res://assets/models/Boss/boss.glb"}
    return {}
