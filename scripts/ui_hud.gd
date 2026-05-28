extends CanvasLayer

var _wall_bar: ColorRect
var _wall_text: Label
var _gold_label: Label
var _kill_label: Label
var _state_label: Label
var _p_was_down := false


func _ready():
    process_mode = Node.PROCESS_MODE_ALWAYS
    # 城墙血条背景
    var bg := ColorRect.new()
    bg.color = Color(0.2, 0.1, 0.1, 0.8)
    bg.size = Vector2(300, 24)
    bg.position = Vector2(10, 10)
    add_child(bg)

    # 城墙血条前景
    _wall_bar = ColorRect.new()
    _wall_bar.color = Color.RED
    _wall_bar.size = Vector2(296, 20)
    _wall_bar.position = Vector2(12, 12)
    add_child(_wall_bar)

    # 血条文字
    _wall_text = Label.new()
    _wall_text.position = Vector2(14, 12)
    _wall_text.size = Vector2(296, 20)
    _wall_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    add_child(_wall_text)

    # 金币
    _gold_label = Label.new()
    _gold_label.position = Vector2(10, 40)
    _gold_label.add_theme_color_override("font_color", Color.YELLOW)
    _gold_label.add_theme_font_size_override("font_size", 22)
    add_child(_gold_label)

    # 击杀进度
    _kill_label = Label.new()
    _kill_label.position = Vector2(10, 66)
    _kill_label.add_theme_color_override("font_color", Color.WHITE)
    _kill_label.add_theme_font_size_override("font_size", 18)
    add_child(_kill_label)

    # 状态提示
    _state_label = Label.new()
    _state_label.position = Vector2(10, 90)
    _state_label.add_theme_color_override("font_color", Color.GREEN)
    _state_label.add_theme_font_size_override("font_size", 16)
    add_child(_state_label)


func _process(_delta: float):
    if not is_instance_valid(GameState):
        return

    var ratio: float = GameState.wall_hp / GameConfig.WALL_MAX_HP
    _wall_bar.size.x = 296 * ratio
    if ratio < 0.3:
        _wall_bar.color = Color.RED
    elif ratio < 0.6:
        _wall_bar.color = Color.ORANGE
    else:
        _wall_bar.color = Color.GREEN

    _wall_text.text = "Wall: %.0f / %.0f" % [GameState.wall_hp, GameConfig.WALL_MAX_HP]
    _gold_label.text = "Gold: %d" % GameState.gold
    _kill_label.text = "Kills: %d / %d" % [GameState.enemies_killed, GameState.enemies_total]

    var state_names := ["MENU", "ARCHIVE", "LEVEL_SELECT", "PLAYING", "PAUSED", "VICTORY", "DEFEAT"]
    _state_label.text = "State: %s" % state_names[GameState.current_state]

    # P 键暂停/恢复
    var p_down := Input.is_key_pressed(KEY_P)
    if p_down and not _p_was_down:
        if GameState.current_state == GameState.State.PLAYING:
            GameState.current_state = GameState.State.PAUSED
            get_tree().paused = true
        elif GameState.current_state == GameState.State.PAUSED:
            GameState.current_state = GameState.State.PLAYING
            get_tree().paused = false
    _p_was_down = p_down
