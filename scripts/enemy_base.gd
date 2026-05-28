extends Node3D

enum State { WALK, ATTACK_MELEE, ATTACK_RANGED, DEATH, DYING }

var hp: float
var move_speed: float
var damage: float
var attack_interval: float
var gold_reward: int
var attack_range: float = 2.0       # 距城墙多远开始攻击
var is_ranged: bool = false

var _state: State = State.WALK
var _attack_timer: float = 0.0
var _wall_ref: Node3D = null
var _target_pos: Vector3
var _spawned: bool = false

# 模型路径（子类覆盖）
var model_paths: Dictionary = {}


func setup(stats: Dictionary, model_dir: String):
    hp = stats["hp"]
    move_speed = stats["speed"]
    damage = stats["damage"]
    attack_interval = stats["attack_interval"]
    gold_reward = stats["gold"]
    is_ranged = stats.get("ranged", false)
    attack_range = stats.get("attack_range", 2.0)


func _ready():
    _target_pos = Vector3(0, 0, -28)  # 城墙位置
    # 加载行走模型
    if model_paths.has("walk"):
        _load_model(model_paths["walk"])


func _process(delta: float):
    if _state == State.DYING or _state == State.DEATH:
        return

    if not _wall_ref:
        _wall_ref = get_node_or_null("/root/Level/Wall")

    var dist := global_position.distance_to(_target_pos)

    match _state:
        State.WALK:
            if dist > attack_range:
                var dir := (_target_pos - global_position).normalized()
                dir.y = 0
                global_position += dir * move_speed * delta
                # 面朝城墙
                if dir.length() > 0.01:
                    look_at(global_position - dir, Vector3.UP)
            else:
                if is_ranged:
                    _state = State.ATTACK_RANGED
                else:
                    _state = State.ATTACK_MELEE
                _attack_timer = 0.0

        State.ATTACK_MELEE, State.ATTACK_RANGED:
            _attack_timer -= delta
            if _attack_timer <= 0:
                _attack_timer = attack_interval
                if _wall_ref and _wall_ref.has_method("take_damage"):
                    _wall_ref.take_damage(damage)
                # TODO: 远程怪发射弹幕


func take_damage(dmg: float):
    hp -= dmg
    if hp <= 0:
        hp = 0
        _die()


func _die():
    _state = State.DYING
    GameState.gold += gold_reward
    GameState.enemies_killed += 1
    # 播放死亡动画后删除
    var t := create_tween()
    t.tween_property(self, "scale", Vector3.ZERO, 0.3)
    t.tween_callback(queue_free)


func _load_model(path: String):
    var scene: PackedScene = load(path)
    if scene:
        var instance: Node = scene.instantiate()
        add_child(instance)
