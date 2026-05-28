extends Node3D

const EnemyScript = preload("res://scripts/enemy_base.gd")
const MELEE_MODEL = preload("res://assets/models/monsters/monster1/walk.glb")

var _timer: float = 0.0


func _ready():
    print("TestSpawner ready")


func _process(delta: float):
    _timer -= delta
    if _timer > 0:
        return
    _timer = 2.0

    print("Spawning enemy...")
    var enemy := Node3D.new()
    enemy.set_script(EnemyScript)
    enemy.setup({
        "hp": GameConfig.MELEE_HP,
        "speed": GameConfig.MELEE_SPEED,
        "damage": GameConfig.MELEE_DAMAGE,
        "attack_interval": GameConfig.MELEE_ATTACK_INTERVAL,
        "gold": GameConfig.MELEE_GOLD,
    }, "res://assets/models/monsters/monster1/")
    enemy.model_paths["walk"] = "res://assets/models/monsters/monster1/walk.glb"

    var x := randf_range(-20, 20)
    var z := randf_range(10, 30)
    enemy.position = Vector3(x, 0, z)
    enemy.name = "MeleeGrunt"

    # 红色方块表示敌人
    var mesh := MeshInstance3D.new()
    var box := BoxMesh.new()
    box.size = Vector3(4, 8, 4)
    mesh.mesh = box
    mesh.position.y = 4.0
    var mat := StandardMaterial3D.new()
    mat.albedo_color = Color.RED
    mesh.material_override = mat
    enemy.add_child(mesh)

    get_parent().add_child(enemy)
    print("Enemy spawned at ", enemy.position)
