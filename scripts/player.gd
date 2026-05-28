extends Node3D

const BulletScript = preload("res://scripts/bullet.gd")

var _cooldown_timer: float = 0.0

func _process(delta: float):
	_cooldown_timer -= delta

	var camera := get_viewport().get_camera_3d()
	if not camera:
		return

	# 鼠标射线投射到地面 (y=0)
	var mouse_pos := get_viewport().get_mouse_position()
	var from := camera.project_ray_origin(mouse_pos)
	var dir := camera.project_ray_normal(mouse_pos)
	if dir.y >= 0:
		return

	var t := -from.y / dir.y
	var hit := from + dir * t

#面朝鼠标方向
	var target := hit
	target.y = global_position.y
	look_at(target)

	# 左键射击
	if Input.is_action_just_pressed("shoot") and _cooldown_timer <= 0:
		_cooldown_timer = GameState.get_player_cooldown()
		var bullet_dir := (hit - global_position).normalized()
		var count := GameState.get_player_bullet_count()
		var angle_step := 0.05  # 多发子弹散布
		for i in range(count):
			var spread := bullet_dir
			if count > 1:
				var offset := (i - (count - 1) * 0.5) * angle_step
				spread = spread.rotated(Vector3.UP, offset)
			var b := BulletScript.create(spread, 40.0, GameState.get_player_damage(),
								   Color.YELLOW, Color(1.0, 0.6, 0))
			get_tree().root.add_child(b)
			b.global_position = global_position + Vector3(0, 1.5, 0)
