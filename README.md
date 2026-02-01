---

# 📚 Study View

**Study View** 是一个集 **学习计时 / 学习日历 / 本地音乐播放** 于一体的轻量级学习辅助 Web 应用，基于 **Flask** 开发，支持 **本地 Python 运行** 与 **Docker 一键部署**，适合个人长期使用与服务器部署。

---

## ✨ 功能一览

### 🎧 本地音乐播放

* 支持播放自定义音乐文件
* 支持 **歌曲背景视频**
* 支持 **播放器封面自定义**
* 为学习提供沉浸式专注环境

### ⏱️ 学习计时

* 记录学习开始与结束时间
* 累计学习时长
* 适合番茄钟 / 长时间专注场景

### 📅 学习日历

* 以日历形式展示学习记录
* 快速回顾学习情况
* 帮助建立持续学习习惯

### 🔐 管理员后台

* 独立管理员界面 `/admin`
* 管理音乐展示资源
* 支持：

  * 歌曲背景视频 **新增 / 删除**
  * 播放器封面 **新增 / 删除**

---

## 🚀 运行方式一：Python 本地运行（开发 / 个人使用）

### 1️⃣ 获取项目代码

```bash
git clone https://github.com/fumiaogodv/study_view.git
cd study_view
```

### 2️⃣ 安装依赖

请确保已安装 **Python 3.8+**：

```bash
pip install -r requirements.txt
```

### 3️⃣ 添加音乐文件

将音乐文件放入：

```text
static/music/
```

支持常见音频格式（如 `.mp3`）。

### 4️⃣ 启动应用

```bash
python app.py
```

访问：

```text
http://localhost:5000
```

---

## 🐳 运行方式二：Docker 部署（推荐服务器 / 长期使用）

### 1️⃣ 拉取或构建镜像

```bash
docker pull 0424godv/study_view
```

或使用 `docker-compose` 本地构建。

---

### 2️⃣ 创建 `docker-compose.yml`

```yaml
version: "3.9"

services:
  study_view:
    # 使用本地 Dockerfile 构建
    build: .

    image: 0424godv/study_view:latest
    container_name: view-prod

    ports:
      - "5000:5000"

    volumes:
      # 学习记录与配置持久化
      - ./instance:/app/instance

      # 音乐与视频资源热更新
      - ./static/music:/app/static/music
      - ./static/videos:/app/static/videos

    environment:
      # 生产环境
      - FLASK_ENV=production

      # 管理员账号（可自定义）
      - STUDY_ADMIN_USER=admin
      - STUDY_ADMIN_PASS=admin

      # Flask 会话密钥（请修改为随机字符串）
      - FLASK_SECRET_KEY=anything_unique_string

    restart: unless-stopped
```

### 3️⃣ 启动服务

```bash
docker compose up -d
```

访问：

```text
http://localhost:5000
```

---

## 🔐 管理员后台说明

### 后台地址

```text
http://<IP>:5000/admin
```

---

### 管理员账号来源

#### Python 本地运行

```text
用户名：admin
密码：123456
```

#### Docker 部署

由环境变量控制：

```yaml
STUDY_ADMIN_USER=admin
STUDY_ADMIN_PASS=admin
```

修改后重新启动容器即可生效。

---

### 管理功能说明

#### 🎵 歌曲背景视频

* 支持新增 / 删除
* 视频文件位于：

```text
static/videos/
```

#### 🖼️ 播放器封面

* 支持新增 / 删除
* ⚠️ **封面图片文件名必须为：**

```text
img.png
```

否则将无法正常显示。

---

## 🎵 Docker 资源热更新机制（重要）

Docker 版本通过 volume 挂载实现 **资源热更新**：

### 🎧 音乐

```text
static/music/
```

* 新增 / 删除音乐后
* **无需重启容器**
* 刷新页面即可生效

### 🎬 视频

```text
static/videos/
```

* 支持后台管理
* 即时生效

### 🗃️ 数据

```text
instance/
```

* 保存学习记录与配置
* 升级镜像 / 重建容器 **不会丢失数据**

---

## 🛠️ 技术栈

* Backend：Flask
* Frontend：HTML / CSS / JavaScript
* Deployment：Docker / Docker Compose

---

## 📌 适合人群

* 希望建立 **长期专注学习环境** 的用户
* 喜欢 **音乐 + 计时 + 轻量 UI** 的极简主义者
* 想要 **低成本、自部署学习工具** 的个人用户

---

## 📈 项目状态

> 本项目仍在持续更新中，
> 欢迎 Issue、建议与 PR。

---

