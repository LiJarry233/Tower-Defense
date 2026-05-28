extends Node3D

func _ready():
    var wave: Node = get_node_or_null("WaveManager")
    if wave and wave.has_method("start_level"):
        wave.start_level(1)
