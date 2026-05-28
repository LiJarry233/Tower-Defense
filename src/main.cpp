#include "game.h"
#include "assimp_loader.h"

#include "raylib.h"
#include "raymath.h"
#include "rlgl.h"

#include <cmath>
#include <cstdio>

// ============================================================================
// 全局运行时
// ============================================================================
static GameRuntime g;

// ============================================================================
// 场景资源
// ============================================================================
static Model wallModel = {};
static BoundingBox wallBBox = {};
static Texture2D groundTex = {};

// ============================================================================
// 摄像机
// ============================================================================
static Camera3D camera = {};

static void InitCamera()
{
    camera.position   = { 0.0f, 40.0f, 80.0f };
    camera.target     = { 0.0f, 10.0f, -30.0f };
    camera.up         = { 0.0f, 1.0f, 0.0f };
    camera.fovy       = 60.0f;
    camera.projection = CAMERA_PERSPECTIVE;

    DisableCursor();
}

// ============================================================================
// 场景加载
// ============================================================================
static void InitScene()
{
    groundTex = LoadTexture("assets/ground-unity/windswept-wasteland_albedo.png");

    // 1. raylib原生加载 → mesh能渲染
    wallModel = LoadModel("assets/models/wall.glb");

    // 2. assimp加载 → 提取纹理
    Model texSource = LoadModelAssimp("assets/models/wall.glb");

    // 3. 诊断：打印两个模型的材质信息
    TraceLog(LOG_INFO, "RAYLIB model: %d materials", wallModel.materialCount);
    for (int i = 0; i < wallModel.materialCount; i++) {
        unsigned int tid = wallModel.materials[i].maps[MATERIAL_MAP_ALBEDO].texture.id;
        Color c = wallModel.materials[i].maps[MATERIAL_MAP_ALBEDO].color;
        TraceLog(LOG_INFO, "  mat[%d]: texId=%d, color=(%d,%d,%d,%d)",
            i, tid, c.r, c.g, c.b, c.a);
    }
    TraceLog(LOG_INFO, "ASSIMP model: %d materials", texSource.materialCount);
    for (int i = 0; i < texSource.materialCount; i++) {
        unsigned int tid = texSource.materials[i].maps[MATERIAL_MAP_ALBEDO].texture.id;
        Color c = texSource.materials[i].maps[MATERIAL_MAP_ALBEDO].color;
        TraceLog(LOG_INFO, "  mat[%d]: texId=%d, color=(%d,%d,%d,%d)",
            i, tid, c.r, c.g, c.b, c.a);
    }

    // 4. 把assimp纹理移植到正确的材质槽（mesh实际使用的那个）
    Texture2D goodTex = {};
    for (int i = 0; i < texSource.materialCount; i++) {
        if (texSource.materials[i].maps[MATERIAL_MAP_ALBEDO].texture.id > 0) {
            goodTex = texSource.materials[i].maps[MATERIAL_MAP_ALBEDO].texture;
            // 清空引用防止卸载
            texSource.materials[i].maps[MATERIAL_MAP_ALBEDO].texture = {};
            break;
        }
    }
    if (goodTex.id > 0) {
        // 把纹理设置到mesh实际使用的材质上
        int usedMat = wallModel.meshMaterial[0];
        wallModel.materials[usedMat].maps[MATERIAL_MAP_ALBEDO].texture = goodTex;
        wallModel.materials[usedMat].maps[MATERIAL_MAP_ALBEDO].color = WHITE;
        TraceLog(LOG_INFO, "  Texture %d assigned to mat[%d] (used by mesh[0])", goodTex.id, usedMat);
    }

    // 5. 释放assimp资源（纹理已转移）
    for (int i = 0; i < texSource.meshCount; i++) UnloadMesh(texSource.meshes[i]);
    MemFree(texSource.meshes);
    for (int i = 0; i < texSource.materialCount; i++) UnloadMaterial(texSource.materials[i]);
    MemFree(texSource.materials);
    MemFree(texSource.meshMaterial);

    wallBBox = GetMeshBoundingBox(wallModel.meshes[0]);
}

static void UnloadScene()
{
    UnloadModel(wallModel);
    UnloadTexture(groundTex);
}

static void UpdateCameraManual()
{
    const float moveSpeed = 15.0f * GetFrameTime();
    const float zoomSpeed = 2.0f;
    const float minZoom   = 10.0f;
    const float maxZoom   = 60.0f;

    // 键盘移动摄像机（上下左右移动target和position）
    Vector3 forward = Vector3Subtract(camera.target, camera.position);
    forward.y = 0;
    forward = Vector3Normalize(forward);
    Vector3 right = Vector3CrossProduct(forward, camera.up);

    if (IsKeyDown(KEY_UP)) {
        camera.position = Vector3Add(camera.position, Vector3Scale(forward, moveSpeed));
        camera.target   = Vector3Add(camera.target, Vector3Scale(forward, moveSpeed));
    }
    if (IsKeyDown(KEY_DOWN)) {
        camera.position = Vector3Subtract(camera.position, Vector3Scale(forward, moveSpeed));
        camera.target   = Vector3Subtract(camera.target, Vector3Scale(forward, moveSpeed));
    }
    if (IsKeyDown(KEY_LEFT)) {
        camera.position = Vector3Subtract(camera.position, Vector3Scale(right, moveSpeed));
        camera.target   = Vector3Subtract(camera.target, Vector3Scale(right, moveSpeed));
    }
    if (IsKeyDown(KEY_RIGHT)) {
        camera.position = Vector3Add(camera.position, Vector3Scale(right, moveSpeed));
        camera.target   = Vector3Add(camera.target, Vector3Scale(right, moveSpeed));
    }

    // 鼠标滚轮缩放
    float wheel = GetMouseWheelMove();
    if (wheel != 0.0f) {
        Vector3 dir = Vector3Subtract(camera.target, camera.position);
        float dist  = Vector3Length(dir);
        float newDist = dist - wheel * zoomSpeed;
        if (newDist >= minZoom && newDist <= maxZoom) {
            dir = Vector3Scale(Vector3Normalize(dir), newDist);
            camera.position = Vector3Subtract(camera.target, dir);
        }
    }

    // 右键拖拽旋转
    if (IsMouseButtonDown(MOUSE_BUTTON_RIGHT)) {
        Vector2 delta = GetMouseDelta();
        float sensitivity = 0.3f;
        // 绕目标旋转
        Vector3 dir = Vector3Subtract(camera.position, camera.target);
        // 水平旋转
        Matrix rotH = MatrixRotateY(-delta.x * sensitivity * DEG2RAD);
        dir = Vector3Transform(dir, rotH);
        // 垂直旋转
        Vector3 rightAxis = Vector3CrossProduct(dir, camera.up);
        Matrix rotV = MatrixRotate(rightAxis, -delta.y * sensitivity * DEG2RAD);
        dir = Vector3Transform(dir, rotV);
        camera.position = Vector3Add(camera.target, dir);
    }

    // 限制摄像机在战场范围内
    camera.position.x = Clamp(camera.position.x, -350.0f, 350.0f);
    camera.position.z = Clamp(camera.position.z, -350.0f, 350.0f);
    camera.position.y = Clamp(camera.position.y, 10.0f, 200.0f);
    camera.target.x   = Clamp(camera.target.x, -300.0f, 300.0f);
    camera.target.z   = Clamp(camera.target.z, -300.0f, 300.0f);
}

// ============================================================================
// 各状态处理函数（占位）
// ============================================================================
static void UpdateMenu()
{
    // TODO: 主菜单 UI
    if (IsKeyPressed(KEY_ENTER)) {
        g.state = GameState::ARCHIVE;
    }
}

static void DrawMenu()
{
    DrawText("MAIN MENU - Press ENTER to start", 10, 10, 20, WHITE);
}

static void UpdateArchive()
{
    // TODO: 存档选择 UI
    if (IsKeyPressed(KEY_BACKSPACE)) {
        g.state = GameState::MENU;
    }
    if (IsKeyPressed(KEY_ENTER)) {
        g.state = GameState::LEVEL_SELECT;
    }
}

static void DrawArchive()
{
    DrawText("ARCHIVE SELECT - Press ENTER to continue, BACKSPACE to back",
             10, 10, 20, WHITE);
}

static void UpdateLevelSelect()
{
    // TODO: 关卡选择 UI
    if (IsKeyPressed(KEY_BACKSPACE)) {
        g.state = GameState::ARCHIVE;
    }
    if (IsKeyPressed(KEY_ONE)) {
        g.currentLevel = 1;
        g.state = GameState::PLAYING;
    }
    if (IsKeyPressed(KEY_TWO)) {
        g.currentLevel = 2;
        g.state = GameState::PLAYING;
    }
    if (IsKeyPressed(KEY_THREE)) {
        g.currentLevel = 3;
        g.state = GameState::PLAYING;
    }
}

static void DrawLevelSelect()
{
    DrawText("LEVEL SELECT - Press 1/2/3 to start level, BACKSPACE to back",
             10, 10, 20, WHITE);
}

static void UpdatePlaying()
{
    // TODO: 对局逻辑
    if (IsKeyPressed(KEY_ESCAPE)) {
        g.state = GameState::PAUSED;
    }
    // 战斗胜利测试
    if (IsKeyPressed(KEY_V)) {
        g.state = GameState::VICTORY;
    }
    // 战斗失败测试
    if (IsKeyPressed(KEY_F)) {
        g.state = GameState::DEFEAT;
    }
}

static void DrawPlayingHUD()
{
    DrawText("PLAYING - ESC to pause, V=win test, F=lose test",
             10, 10, 20, WHITE);

    // HUD 占位：血条 + 金币 + 进度
    DrawRectangle(10, 40, 200, 20, DARKGRAY);
    DrawRectangle(10, 40, (int)(200 * g.wallHP / GameConfig::WALL_MAX_HP), 20, RED);
    DrawText(TextFormat("Wall: %.0f/%.0f", g.wallHP, (float)GameConfig::WALL_MAX_HP),
             12, 42, 14, WHITE);

    DrawText(TextFormat("Gold: %d", g.gold), 10, 65, 20, YELLOW);

    DrawText(TextFormat("Kills: %d/%d", g.enemiesKilled, g.enemiesTotal),
             10, 90, 20, WHITE);
}

static void UpdatePaused()
{
    // TODO: 暂停界面
    if (IsKeyPressed(KEY_ESCAPE)) {
        g.state = GameState::PLAYING;
    }
    if (IsKeyPressed(KEY_BACKSPACE)) {
        g.state = GameState::LEVEL_SELECT;
    }
}

static void DrawPaused()
{
    DrawText("PAUSED - ESC to continue, BACKSPACE to quit",
             10, 10, 20, WHITE);
}

static void UpdateVictory()
{
    // TODO: 胜利结算
    if (IsKeyPressed(KEY_ENTER)) {
        if (g.currentLevel < 3) {
            g.currentLevel++;
            g.state = GameState::PLAYING;
        } else {
            g.state = GameState::LEVEL_SELECT;
        }
    }
}

static void DrawVictory()
{
    DrawText("VICTORY! Press ENTER to continue",
             GetScreenWidth() / 2 - 150, GetScreenHeight() / 2, 30, GREEN);
}

static void UpdateDefeat()
{
    // TODO: 失败结算
    if (IsKeyPressed(KEY_R)) {
        g.state = GameState::PLAYING; // 重试
    }
    if (IsKeyPressed(KEY_BACKSPACE)) {
        g.state = GameState::LEVEL_SELECT;
    }
}

static void DrawDefeat()
{
    DrawText("DEFEAT! Press R to retry, BACKSPACE to quit",
             GetScreenWidth() / 2 - 200, GetScreenHeight() / 2, 30, RED);
}

// ============================================================================
// 绘制3D场景（占位）
// ============================================================================
static void Draw3DScene()
{
    BeginMode3D(camera);

    // 地面 — 600×600 大平面 + 荒地贴图
    rlSetTexture(groundTex.id);
    rlBegin(RL_QUADS);
        float gs = 300.0f;
        float tu = 60.0f;
        rlTexCoord2f(0, 0);     rlVertex3f(-gs, 0, -gs);
        rlTexCoord2f(0, tu);    rlVertex3f(-gs, 0,  gs);
        rlTexCoord2f(tu, tu);   rlVertex3f( gs, 0,  gs);
        rlTexCoord2f(tu, 0);    rlVertex3f( gs, 0, -gs);
    rlEnd();
    rlSetTexture(0);

    // 城墙模型
    Vector3 bboxSize = {
        wallBBox.max.x - wallBBox.min.x,
        wallBBox.max.y - wallBBox.min.y,
        wallBBox.max.z - wallBBox.min.z
    };
    float targetWidth = 40.0f;
    float autoScale = (bboxSize.x > 0.001f) ? targetWidth / bboxSize.x : 1.0f;

    Vector3 wallPos = { 0, 0, -30 };

    rlDisableBackfaceCulling();
    DrawModel(wallModel, wallPos, autoScale, WHITE);
    rlEnableBackfaceCulling();

    // 诊断
    float bh = bboxSize.y * autoScale;
    DrawCubeWires({ wallPos.x, wallPos.y + bh * 0.5f, wallPos.z }, targetWidth, bh, bboxSize.z * autoScale, RED);
    DrawSphere(wallPos, 1.5f, GREEN);
    BoundingBox worldBox = {
        { wallBBox.min.x * autoScale + wallPos.x, wallBBox.min.y * autoScale + wallPos.y, wallBBox.min.z * autoScale + wallPos.z },
        { wallBBox.max.x * autoScale + wallPos.x, wallBBox.max.y * autoScale + wallPos.y, wallBBox.max.z * autoScale + wallPos.z }
    };
    DrawBoundingBox(worldBox, BLUE);

    float turretX = 12.0f;
    float turretY = bh + 1.0f;
    float turretZ = wallPos.z;
    DrawSphere({ -turretX, turretY, turretZ }, 0.6f, WHITE);
    DrawSphere({  turretX, turretY, turretZ }, 0.6f, WHITE);

    EndMode3D();
}

// ============================================================================
// 主函数
// ============================================================================
int main()
{
    // --- 初始化窗口 ---
    const int screenWidth  = 1280;
    const int screenHeight = 720;
    InitWindow(screenWidth, screenHeight, "Tower Defense - 末日塔防");
    SetTargetFPS(60);

    InitCamera();
    InitScene();

    // --- 游戏主循环 ---
    while (!WindowShouldClose()) {
        // 摄像机更新（非对局状态也可以移动）
        UpdateCameraManual();

        // 状态机
        switch (g.state) {
        case GameState::MENU:
            UpdateMenu();
            break;
        case GameState::ARCHIVE:
            UpdateArchive();
            break;
        case GameState::LEVEL_SELECT:
            UpdateLevelSelect();
            break;
        case GameState::PLAYING:
            UpdatePlaying();
            break;
        case GameState::PAUSED:
            UpdatePaused();
            break;
        case GameState::VICTORY:
            UpdateVictory();
            break;
        case GameState::DEFEAT:
            UpdateDefeat();
            break;
        }

        // --- 渲染 ---
        BeginDrawing();
        ClearBackground({ 35, 18, 8, 255 }); // 末日暗橙棕色天空

        Draw3DScene();

        // 根据状态绘制对应UI
        switch (g.state) {
        case GameState::MENU:
            DrawMenu();
            break;
        case GameState::ARCHIVE:
            DrawArchive();
            break;
        case GameState::LEVEL_SELECT:
            DrawLevelSelect();
            break;
        case GameState::PLAYING:
            DrawPlayingHUD();
            break;
        case GameState::PAUSED:
            DrawPlayingHUD(); // 保留底层
            DrawPaused();
            break;
        case GameState::VICTORY:
            DrawPlayingHUD();
            DrawVictory();
            break;
        case GameState::DEFEAT:
            DrawPlayingHUD();
            DrawDefeat();
            break;
        }

        DrawFPS(GetScreenWidth() - 90, 10);
        EndDrawing();
    }

    UnloadScene();
    CloseWindow();
    return 0;
}
