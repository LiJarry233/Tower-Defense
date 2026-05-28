extends Node3D

enum AnimState { WALK, ATTACK, DEATH }

var hp: float = 400
var speed: float = 2.0
var damage: float = 100
var attack_cd: float = 1.0
var gold: int = 10
var attack_range: float = 2.5
var model_walk: String = ""
var model_attack: String = ""
var model_death: String = ""

var _attack_timer: float = 0.0
var _dead: bool = false
var _wall_node: Node = null
var _anim_state: int = AnimState.WALK
var _target := Vector3(0, 0, -28)
var _model_root: Node = null
var _anim_player: AnimationPlayer = null


func _ready():
	add_to_group("enemy")

	var p := model_walk
	if not p.is_empty() and ResourceLoader.exists(p):
		var scene: PackedScene = load(p)
		if scene:
			_model_root = scene.instantiate()
			_anim_player = _find_anim(_model_root)
			add_child(_model_root)
			if _anim_player:
				print("AnimPlayer: ", _anim_player.get_animation_list(),
					" root=", _anim_player.root_node,
					" active=", _anim_player.is_active(),
					" playing=", _anim_player.is_playing())
				# 确保 active
				_anim_player.set_active(true)

	# 找骨骼引用
	var skel: Skeleton3D = _find_skeleton(_model_root)
	# 修复所有 skinned MeshInstance3D 的 skeleton 引用
	if skel:
		print("Skeleton found, bone_count=", skel.get_bone_count())
		for child in _find_all_nodes(_model_root):
			if child is MeshInstance3D and child.skin:
				print("  Fixing skeleton ref for: ", child.name)
				child.skeleton = skel.get_path()

	await get_tree().process_frame
	if _anim_player and _anim_player.has_animation("mixamo_com"):
		_anim_player.play("mixamo_com")
		# 手动推进一帧
		_anim_player.advance(0.5)
		print("After advance(0.5): playing=", _anim_player.is_playing(),
			" pos=", _anim_player.current_animation_position)
		# 检查骨骼是否动了
		if skel:
			print("  Hips rest: ", skel.get_bone_rest(0))
			print("  Hips pose: ", skel.get_bone_pose_position(0))

	if hp >= 4000:
		scale = Vector3(8, 8, 8)
	elif hp >= 2000:
		scale = Vector3(5, 5, 5)
	else:
		scale = Vector3(3, 3, 3)


func _find_anim(node: Node) -> AnimationPlayer:
	for child in node.get_children():
		if child is AnimationPlayer:
			return child
		var found: AnimationPlayer = _find_anim(child)
		if found:
			return found
	return null


func _find_skeleton(node: Node) -> Skeleton3D:
	for child in node.get_children():
		if child is Skeleton3D:
			return child
		var found: Skeleton3D = _find_skeleton(child)
		if found:
			return found
	return null


func _find_all_nodes(node: Node) -> Array[Node]:
	var result: Array[Node] = [node]
	for child in node.get_children():
		result.append_array(_find_all_nodes(child))
	return result


func _process(delta: float):
	if _dead:
		return

	if not _wall_node:
		_wall_node = get_node_or_null("/root/Level/Wall")

	var dist := global_position.distance_to(_target)

	if dist > attack_range:
		if _anim_state != AnimState.WALK:
			_anim_state = AnimState.WALK
		var dir := (_target - global_position).normalized()
		dir.y = 0
		global_position += dir * speed * delta
		if dir.length() > 0.01:
			look_at(global_position - dir, Vector3.UP)
	else:
		if _anim_state != AnimState.ATTACK:
			_anim_state = AnimState.ATTACK
		_attack_timer -= delta
		if _attack_timer <= 0:
			_attack_timer = attack_cd
			GameState.wall_hp -= damage
			if GameState.wall_hp <= 0:
				GameState.wall_hp = 0
				GameState.current_state = GameState.State.DEFEAT


func hit(dmg: float):
	hp -= dmg
	if hp <= 0 and not _dead:
		_dead = true
		GameState.gold += gold
		GameState.enemies_killed += 1

		if _anim_player:
			var anims := _anim_player.get_animation_list()
			if anims.size() > 0:
				print("Playing: ", anims[0])
				_anim_player.play(anims[0])
				var anim_len := maxf(_anim_player.get_animation(anims[0]).length, 1.0)
				await get_tree().create_timer(anim_len).timeout
		else:
			await get_tree().create_timer(1.0).timeout
		queue_free()
