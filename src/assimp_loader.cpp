#include "assimp_loader.h"

#include "assimp/Importer.hpp"
#include "assimp/postprocess.h"
#include "assimp/scene.h"

#include "raymath.h"
#include "rlgl.h"

#include <cstdio>
#include <cstring>
#include <vector>

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------
static Mesh AssimpMeshToRaylib(const aiMesh *src)
{
    Mesh mesh = {};
    mesh.vertexCount   = src->mNumVertices;
    mesh.triangleCount = src->mNumFaces;

    // 顶点位置
    mesh.vertices = (float *)MemAlloc(mesh.vertexCount * 3 * sizeof(float));
    for (unsigned i = 0; i < mesh.vertexCount; i++) {
        mesh.vertices[i * 3 + 0] = src->mVertices[i].x;
        mesh.vertices[i * 3 + 1] = src->mVertices[i].y;
        mesh.vertices[i * 3 + 2] = src->mVertices[i].z;
    }

    // 法线
    if (src->HasNormals()) {
        mesh.normals = (float *)MemAlloc(mesh.vertexCount * 3 * sizeof(float));
        for (unsigned i = 0; i < mesh.vertexCount; i++) {
            mesh.normals[i * 3 + 0] = src->mNormals[i].x;
            mesh.normals[i * 3 + 1] = src->mNormals[i].y;
            mesh.normals[i * 3 + 2] = src->mNormals[i].z;
        }
    }

    // 纹理坐标 (取第0通道)
    if (src->HasTextureCoords(0)) {
        mesh.texcoords = (float *)MemAlloc(mesh.vertexCount * 2 * sizeof(float));
        for (unsigned i = 0; i < mesh.vertexCount; i++) {
            mesh.texcoords[i * 2 + 0] = src->mTextureCoords[0][i].x;
            mesh.texcoords[i * 2 + 1] = src->mTextureCoords[0][i].y;
        }
    }

    // 索引
    mesh.indices = (unsigned short *)MemAlloc(mesh.triangleCount * 3 * sizeof(unsigned short));
    for (unsigned i = 0; i < mesh.triangleCount; i++) {
        const aiFace &face = src->mFaces[i];
        for (unsigned j = 0; j < 3; j++) {
            mesh.indices[i * 3 + j] = (unsigned short)face.mIndices[j];
        }
    }

    UploadMesh(&mesh, false);
    return mesh;
}

// ---------------------------------------------------------------------------
// 从 assimp 加载纹理（内嵌或外部文件）
// ---------------------------------------------------------------------------
static Texture2D LoadTextureFromAssimp(const aiScene *scene, const aiMaterial *mat,
                                        aiTextureType type, const char *modelDir)
{
    if (mat->GetTextureCount(type) == 0) return {};

    aiString path;
    mat->GetTexture(type, 0, &path);

    // 尝试从内嵌纹理加载
    if (path.length > 0 && path.C_Str()[0] == '*') {
        int idx = atoi(path.C_Str() + 1);
        if (idx >= 0 && idx < (int)scene->mNumTextures) {
            const aiTexture *tex = scene->mTextures[idx];
            if (tex->mHeight == 0) {
                // 压缩纹理 (PNG/JPEG 等)
                Image img = LoadImageFromMemory(
                    ".png", (unsigned char *)tex->pcData, (int)tex->mWidth);
                if (img.data) {
                    Texture2D texture = LoadTextureFromImage(img);
                    UnloadImage(img);
                    return texture;
                }
            } else {
                // 原始像素
                Image img = {
                    tex->pcData, (int)tex->mWidth, (int)tex->mHeight, 1, PIXELFORMAT_UNCOMPRESSED_R8G8B8A8
                };
                Texture2D texture = LoadTextureFromImage(img);
                // 不要 UnloadImage，数据来自 assimp
                return texture;
            }
        }
    }

    // 尝试从外部文件加载
    char fullPath[1024];
    snprintf(fullPath, sizeof(fullPath), "%s/%s", modelDir, path.C_Str());
    if (FileExists(fullPath)) {
        Image img = LoadImage(fullPath);
        if (img.data) {
            Texture2D texture = LoadTextureFromImage(img);
            UnloadImage(img);
            return texture;
        }
    }

    return {};
}

// ---------------------------------------------------------------------------
// 主加载函数
// ---------------------------------------------------------------------------
Model LoadModelAssimp(const char *filename)
{
    Model model = {};

    Assimp::Importer importer;
    importer.SetPropertyInteger(AI_CONFIG_PP_SLM_VERTEX_LIMIT, 65000);
    importer.SetPropertyInteger(AI_CONFIG_PP_SLM_TRIANGLE_LIMIT, 130000);
    const aiScene *scene = importer.ReadFile(filename,
        aiProcess_Triangulate |
        aiProcess_CalcTangentSpace |
        aiProcess_GenNormals |
        aiProcess_FlipUVs |
        aiProcess_JoinIdenticalVertices |
        aiProcess_SplitLargeMeshes);

    if (!scene || !scene->HasMeshes()) {
        TraceLog(LOG_ERROR, "ASSIMP: %s", importer.GetErrorString());
        return model;
    }

    // 提取模型所在目录
    char modelDir[1024] = {};
    const char *lastSlash = strrchr(filename, '/');
    const char *lastBSlash = strrchr(filename, '\\');
    const char *sep = (lastBSlash > lastSlash) ? lastBSlash : lastSlash;
    if (sep) {
        size_t len = sep - filename;
        memcpy(modelDir, filename, len);
        modelDir[len] = '\0';
    }

    TraceLog(LOG_INFO, "ASSIMP: Loaded %s — %d meshes, %d materials",
             filename, (int)scene->mNumMeshes, (int)scene->mNumMaterials);

    // 分配 raylib 结构
    model.meshCount   = scene->mNumMeshes;
    model.meshes      = (Mesh *)MemAlloc(model.meshCount * sizeof(Mesh));
    model.materialCount = scene->mNumMaterials;
    model.materials   = (Material *)MemAlloc(model.materialCount * sizeof(Material));
    model.meshMaterial = (int *)MemAlloc(model.meshCount * sizeof(int));

    // 转换网格
    for (unsigned i = 0; i < scene->mNumMeshes; i++) {
        model.meshes[i] = AssimpMeshToRaylib(scene->mMeshes[i]);
        model.meshMaterial[i] = scene->mMeshes[i]->mMaterialIndex;
    }

    // 转换材质
    for (unsigned i = 0; i < scene->mNumMaterials; i++) {
        model.materials[i] = LoadMaterialDefault();
        const aiMaterial *srcMat = scene->mMaterials[i];

        // Base Color / Diffuse
        Texture2D diffTex = LoadTextureFromAssimp(scene, srcMat,
            aiTextureType_BASE_COLOR, modelDir);
        if (!diffTex.id)
            diffTex = LoadTextureFromAssimp(scene, srcMat,
                aiTextureType_DIFFUSE, modelDir);

        if (diffTex.id) {
            model.materials[i].maps[MATERIAL_MAP_ALBEDO].texture = diffTex;
            model.materials[i].maps[MATERIAL_MAP_ALBEDO].color = WHITE;
            TraceLog(LOG_INFO, "ASSIMP: Material[%d] diffuse texture loaded", i);
        }

        // 漫反射颜色（无纹理时使用）
        aiColor4D diffColor;
        if (aiGetMaterialColor(srcMat, AI_MATKEY_COLOR_DIFFUSE, &diffColor) == AI_SUCCESS) {
            model.materials[i].maps[MATERIAL_MAP_ALBEDO].color = {
                (unsigned char)(diffColor.r * 255),
                (unsigned char)(diffColor.g * 255),
                (unsigned char)(diffColor.b * 255),
                (unsigned char)(diffColor.a * 255)
            };
        }
    }

    return model;
}
