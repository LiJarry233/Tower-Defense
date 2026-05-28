cmake_minimum_required(VERSION 3.20)
project(TowerDefense VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# ============================================================================
# 第三方依赖: raylib
# ============================================================================
include(FetchContent)

FetchContent_Declare(
    raylib
    GIT_REPOSITORY https://gitee.com/mirrors/raylib.git
    GIT_TAG        5.5
    GIT_SHALLOW    TRUE
)

# raylib 配置选项：只构建需要的部分
set(BUILD_EXAMPLES OFF CACHE INTERNAL "")
set(BUILD_GAMES    OFF CACHE INTERNAL "")

FetchContent_MakeAvailable(raylib)

# ============================================================================
# 第三方依赖: nlohmann/json
# ============================================================================
FetchContent_Declare(
    json
    GIT_REPOSITORY https://gitee.com/mirrors/nlohmann-json.git
    GIT_TAG        v3.11.3
    GIT_SHALLOW    TRUE
)

FetchContent_MakeAvailable(json)

# ============================================================================
# 第三方依赖: assimp (MSYS2 系统包)
# ============================================================================
set(ASSIMP_DIR "C:/msys64/ucrt64")
set(ASSIMP_INCLUDE_DIR "${ASSIMP_DIR}/include")
set(ASSIMP_BIN_DIR "${ASSIMP_DIR}/bin")

# 创建 imported library，使用绝对路径
add_library(assimp SHARED IMPORTED)
set_target_properties(assimp PROPERTIES
    IMPORTED_LOCATION "${ASSIMP_BIN_DIR}/libassimp-6.dll"
    IMPORTED_IMPLIB   "${ASSIMP_DIR}/lib/libassimp.dll.a"
    INTERFACE_INCLUDE_DIRECTORIES "${ASSIMP_INCLUDE_DIR}"
)

# ============================================================================
# 源文件
# ============================================================================
set(SOURCES
    src/main.cpp
    src/assimp_loader.cpp
)

# ============================================================================
# 可执行文件
# ============================================================================
add_executable(${PROJECT_NAME} ${SOURCES})

target_include_directories(${PROJECT_NAME} PRIVATE src)

target_link_libraries(${PROJECT_NAME} PRIVATE
    raylib
    nlohmann_json::nlohmann_json
    assimp
)

# 复制所有运行时 DLL 到输出目录
set(RUNTIME_DLLS
    libassimp-6.dll
    libminizip-1.dll
    libgcc_s_seh-1.dll
    libstdc++-6.dll
    libwinpthread-1.dll
    zlib1.dll
)

foreach(dll ${RUNTIME_DLLS})
    add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
            "${ASSIMP_BIN_DIR}/${dll}"
            "$<TARGET_FILE_DIR:${PROJECT_NAME}>"
        COMMENT "Copying ${dll} to output directory"
    )
endforeach()

# 复制资源目录到输出目录
add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory_if_different
        "${CMAKE_SOURCE_DIR}/assets"
        "$<TARGET_FILE_DIR:${PROJECT_NAME}>/assets"
    COMMENT "Copying assets to output directory"
)
