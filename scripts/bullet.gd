extends Node3D

var velocity: Vector3
var damage: float
var _life: float = 5.0


static func create(p_dir: Vector3, spd: float, dmg: float, p_color: Color, p_emission: Color) -> Node3D:
    var node := Node3D.new()
    node.set_script(load("res://scripts/bullet.gd"))
    var b := node as Node3D
    b.velocity = p_dir.normalized() * spd
    b.damage = dmg

    var mesh := MeshInstance3D.new()
    var cyl := CylinderMesh.new()
    cyl.top_radius = 0.1
    cyl.bottom_radius = 0.1
    cyl.height = 1.0
    mesh.mesh = cyl
    mesh.rotation_degrees.x = 90

    var mat := StandardMaterial3D.new()
    mat.albedo_color = p_color
    mat.emission_enabled = true
    mat.emission = p_emission
    mat.emission_energy_multiplier = 2.0
    mesh.material_override = mat
    node.add_child(mesh)

    var area := Area3D.new()
    var shape := CollisionShape3D.new()
    var box := BoxShape3D.new()
    box.size = Vector3(0.3, 0.3, 1.2)
    shape.shape = box
    area.add_child(shape)
    node.add_child(area)

    return node


func _process(delta: float):
    _life -= delta
    if _life <= 0:
        queue_free()
        return
    position += velocity * delta

    # 碰撞检测
    for enemy in get_tree().get_nodes_in_group("enemy"):
        if is_instance_valid(enemy) and enemy.has_method("hit"):
            var dist := global_position.distance_to(enemy.global_position)
            if dist < 8.0:
                enemy.hit(damage)
                queue_free()
                return
