
---

# 📚 Study View

**Study View** 是一个集 **学习计时 / 手动记录 / 学习日历 / 本地音乐播放** 于一体的轻量级学习辅助 Web 应用。基于 **Flask** 开发，支持 **Docker** 一键部署，旨在为个人开发者与学生提供一个沉浸式、可高度定制的专注空间。

---

## ✨ 核心功能

### 🎧 沉浸式音乐播放

* **本地化资源**：支持播放自定义音频文件，摆脱平台版权限制。
* **视觉同步**：支持 **歌曲背景视频** 与 **播放器封面** 自定义，营造专属学习氛围。

### ⏱️ 智能学习管理

* **实时计时**：一键开启专注模式，自动累计学习时长。
* **手动记录 (New!)**：支持事后补录学习数据，确保学习日历的完整性，适合非电脑端的学习场景（如阅读纸质书）。
* **可视化日历**：以日历形式直观展示每日学习成果，帮助你建立长期的学习习惯。

### 🔐 强大的管理员后台 (`/admin`)

* **资源热管理**：无需重启，直接在网页端新增或删除背景视频与封面。
* **环境隔离**：支持通过环境变量灵活配置管理账号，确保数据安全。

---

## 🚀 部署指南

### 方式一：Docker 部署 (推荐)

适用于服务器长期运行，支持资源持久化。

1. **拉取镜像**
```bash
docker pull 0424godv/study_view

```


2. **配置 `docker-compose.yml**`
```yaml
version: "3.9"
services:
  study_view:
    image: 0424godv/study_view:latest
    container_name: study-view-app
    ports:
      - "5000:5000"
    volumes:
      - ./instance:/app/instance            # 数据库与学习记录
      - ./static/music:/app/static/music    # 音乐库挂载
      - ./static/videos:/app/static/videos  # 视频资源挂载
    environment:
      - FLASK_ENV=production
      - STUDY_ADMIN_USER=your_admin         # 自定义管理员账号
      - STUDY_ADMIN_PASS=your_password      # 自定义管理员密码
      - FLASK_SECRET_KEY=yoursecretkey      # 安全密钥
    restart: unless-stopped

```


3. **启动**：`docker compose up -d`

---

### 方式二：Python 本地运行

适用于开发调试。

```bash
git clone https://github.com/fumiaogodv/study_view.git
cd study_view
pip install -r requirements.txt
python app.py

```

---

## 📁 资源管理说明

| 资源类型 | 存放路径 | 说明 |
| --- | --- | --- |
| **音频文件** | `static/music/` | 支持 `.mp3`格式，刷新页面即可同步。 |
| **视频背景** | `static/videos/` | 可通过管理员后台上传或删除。 |
| **播放器封面** | `static/` | ⚠️ 文件名必须固定为 `default.png`。 |
| **数据持久化** | `instance/` | 包含 SQLite 数据库，Docker 部署时务必挂载。 |

---

## 🛠️ 技术栈

* **后端**: Python (Flask)
* **前端**: HTML5, CSS3 (响应式布局), JavaScript
* **数据库**: SQLite
* **容器化**: Docker / Docker Compose

---

## 📈 项目路线图

* [x] 移动端适配优化 (Responsive UI)
* [x] 手动录入学习记录功能
* [ ] 增加学习目标设定与倒计时提醒
* [ ] 支持更多样式的日历视图

---
