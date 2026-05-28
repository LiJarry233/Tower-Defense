extends CanvasLayer

var _overlay: ColorRect
var _pause_overlay: ColorRect
var _pause_label: Label
var _title: Label
var _btn1: Button
var _btn2: Button


func _ready():
    process_mode = Node.PROCESS_MODE_ALWAYS
    _overlay = ColorRect.new()
    _overlay.color = Color(0, 0, 0, 0.7)
    _overlay.size = Vector2(1280, 720)
    _overlay.visible = false
    add_child(_overlay)

    # 暂停灰色遮罩
    _pause_overlay = ColorRect.new()
    _pause_overlay.color = Color(0.3, 0.3, 0.3, 0.6)
    _pause_overlay.size = Vector2(1280, 720)
    _pause_overlay.visible = false
    add_child(_pause_overlay)

    _pause_label = Label.new()
    _pause_label.text = "PAUSED"
    _pause_label.add_theme_font_size_override("font_size", 36)
    _pause_label.add_theme_color_override("font_color", Color.WHITE)
    _pause_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _pause_label.position = Vector2(0, 300)
    _pause_label.size = Vector2(1280, 50)
    _pause_overlay.add_child(_pause_label)

    _title = Label.new()
    _title.add_theme_font_size_override("font_size", 48)
    _title.add_theme_color_override("font_color", Color.WHITE)
    _title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _title.position = Vector2(0, 180)
    _title.size = Vector2(1280, 60)
    _overlay.add_child(_title)

    _btn1 = Button.new()
    _btn1.text = "继续"
    _btn1.position = Vector2(490, 300)
    _btn1.size = Vector2(300, 50)
    _btn1.pressed.connect(_on_btn1)
    _overlay.add_child(_btn1)

    _btn2 = Button.new()
    _btn2.text = "退出"
    _btn2.position = Vector2(490, 370)
    _btn2.size = Vector2(300, 50)
    _btn2.pressed.connect(_on_btn2)
    _overlay.add_child(_btn2)


func _process(_delta: float):
    match GameState.current_state:
        GameState.State.PAUSED:
            _pause_overlay.visible = true
            _overlay.visible = false
        GameState.State.VICTORY:
            _pause_overlay.visible = false
            _overlay.visible = true
            _title.text = "胜利！"
            _title.add_theme_color_override("font_color", Color.GREEN)
            _btn1.text = "下一关" if GameState.current_level < 3 else "返回"
            _btn2.visible = true
        GameState.State.DEFEAT:
            _pause_overlay.visible = false
            _overlay.visible = true
            _title.text = "失败"
            _title.add_theme_color_override("font_color", Color.RED)
            _btn1.text = "重试"
            _btn2.visible = true
        _:
            _pause_overlay.visible = false
            _overlay.visible = false


func _on_btn1():
    if GameState.current_state == GameState.State.VICTORY:
        if GameState.current_level < 3:
            GameState.current_level += 1
        get_tree().reload_current_scene()
    elif GameState.current_state == GameState.State.DEFEAT:
        get_tree().reload_current_scene()


func _on_btn2():
    GameState.current_state = GameState.State.MENU
    # TODO: 回到主菜单场景
    get_tree().reload_current_scene()
