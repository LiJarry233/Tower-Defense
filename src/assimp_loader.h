#pragma once

#include "raylib.h"

// 使用 assimp 加载任意格式的 3D 模型（glb/fbx/obj 等），正确导入纹理和材质
Model LoadModelAssimp(const char *filename);
