#!/bin/bash
set -e

# 判断是否为开发模式
if [ "$FLASK_ENV" = "development" ]; then
    echo "检测到开发模式，跳过资源初始化，直接启动..."
    # 开发模式通常建议用 flask run 开启热重载，或者保持 gunicorn
    exec gunicorn -w 4 -b 0.0.0.0:5000 app:app
else
    # --- 以下是生产模式的初始化逻辑 ---
    init_dir() {
        local src="$1"
        local dest="$2"
        mkdir -p "$dest"
        if [ ! "$(ls -A "$dest" 2>/dev/null)" ]; then
            echo "初始化 $dest..."
            cp -r "$src/." "$dest/"
        fi
    }

    mkdir -p /app/instance
    chmod 777 /app/instance

    # 只有备份目录存在时才初始化（防止开发环境报错）
    if [ -d "/app/static_backup" ]; then
        init_dir "/app/static_backup/music" "/app/static/music"
        init_dir "/app/static_backup/videos" "/app/static/videos"
    fi

    echo "生产环境准备就绪..."
    exec gunicorn -w 4 -b 0.0.0.0:5000 app:app
fi