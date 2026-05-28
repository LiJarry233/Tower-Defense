# ============================================================================
# Camera3D 控制器 — 方向键移动 + 滚轮缩放 + 右键旋转
# ============================================================================
extends Camera3D

@export var move_speed: float = 30.0
@export var zoom_speed: float = 5.0
@export var rotate_sensitivity: float = 0.3
@export var min_zoom: float = 5.0
@export var max_zoom: float = 100.0

var _pivot: Vector3 = Vector3(0, 3, -15)


func _ready():
    position = Vector3(0, 25, 50)
    look_at(_pivot)


func _process(delta: float):
    var forward := Vector3(_pivot - position)
    forward.y = 0
    forward = forward.normalized()
    var right := forward.cross(Vector3.UP).normalized()

    # WASD / 方向键 — 平移
    var move_dir := Vector3.ZERO
    if Input.is_action_pressed("camera_up"):    move_dir += forward
    if Input.is_action_pressed("camera_down"):  move_dir -= forward
    if Input.is_action_pressed("camera_left"):  move_dir -= right
    if Input.is_action_pressed("camera_right"): move_dir += right

    var move := move_dir * move_speed * delta
    position += move
    _pivot += move

    # 保持看向枢轴
    look_at(_pivot)


func _unhandled_input(event: InputEvent):
    if event is InputEventMouseButton:
        var dir := (position - _pivot).normalized()
        var dist := position.distance_to(_pivot)
        if event.button_index == MOUSE_BUTTON_WHEEL_UP:
            dist = clamp(dist - zoom_speed, min_zoom, max_zoom)
            position = _pivot + dir * dist
        elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
            dist = clamp(dist + zoom_speed, min_zoom, max_zoom)
            position = _pivot + dir * dist
