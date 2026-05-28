extends Node3D

const BulletScript = preload("res://scripts/bullet.gd")

@export var turret_type: int = 0
var _cooldown: float = 0.0


func _ready():
	var mesh = MeshInstance3D.new()
	var cyl = CylinderMesh.new()
	cyl.top_radius = 1.2
	cyl.bottom_radius = 1.5
	cyl.height = 3.0
	mesh.mesh = cyl
	var mat = StandardMaterial3D.new()
	if turret_type == 0:
		mat.albedo_color = Color.DODGER_BLUE
		_cooldown = GameConfig.NORMAL_TURRET_CD
	else:
		mat.albedo_color = Color.ORANGE
		_cooldown = GameConfig.AOE_TURRET_CD
	mesh.material_override = mat
	add_child(mesh)


func _process(delta: float):
	_cooldown -= delta
	if _cooldown > 0:
		return

	var enemies = get_tree().get_nodes_in_group("enemy")
	if enemies.is_empty():
		return

	var nearest_pos := Vector3.ZERO
	var nearest_dist := 9999.0
	var found := false

	for e in enemies:
		if not is_instance_valid(e):
			continue
		var ep := (e as Node3D).global_position
		var d := global_position.distance_to(ep)
		if d < nearest_dist:
			nearest_dist = d
			nearest_pos = ep
			found = true

	if not found:
		return

	var target_pos := nearest_pos
	target_pos.y = global_position.y
	look_at(target_pos, Vector3.UP)

	_cooldown = GameConfig.NORMAL_TURRET_CD if turret_type == 0 else GameConfig.AOE_TURRET_CD
	var dmg: float = GameConfig.NORMAL_TURRET_DAMAGE if turret_type == 0 else GameConfig.AOE_TURRET_DAMAGE
	var dir: Vector3 = (nearest_pos - global_position).normalized()

	var bullet = BulletScript.create(dir, 50.0, dmg, Color.CYAN, Color(0.3, 0.3, 1.0))
	get_tree().root.add_child(bullet)
	bullet.global_position = global_position + Vector3(0, 2, 0)
