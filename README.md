
---

## 📚 Study View

一个集 **学习计时 / 日历管理 / 本地音乐播放** 于一体的轻量级学习辅助 Web 应用，基于 **Flask** 开发，支持 **Python 直接运行** 和 **Docker 一键部署**。

---

## ✨ 功能特性

* 🎧 **本地音乐播放**

  * 支持播放自定义音乐
  * 学习时自动营造专注氛围
* ⏱️ **学习计时**

  * 记录学习时长
  * 帮助培养稳定的学习节奏
* 📅 **学习日历**

  * 可视化学习记录
  * 方便回顾与规划

---

## 🚀 运行方式一：Python 直接运行（推荐开发 / 本地使用）

### 1️⃣ 下载项目代码

```bash
git clone https://github.com/你的用户名/study_view.git
cd study_view
```

### 2️⃣ 安装依赖

确保你已安装 **Python 3.8+**，然后执行：

```bash
pip install -r requirements.txt
```

### 3️⃣ 添加音乐文件

将你想播放的音乐文件放入目录：

```
static/music/
```

支持常见音频格式（如 `.mp3`）。

### 4️⃣ 启动应用

```bash
python app.py
```

浏览器访问：

```
http://localhost:5000
```

---

## 🐳 运行方式二：Docker 部署（推荐服务器 / 长期使用）

### 1️⃣ 拉取镜像

```bash
docker pull 0424godv/study_view
```

### 2️⃣ 创建 `docker-compose.yml`

你可以使用下面的配置（端口可自行修改）：

```yaml
version: "3.9"

services:
  study_view:
    image: 0424godv/study_view:latest
    container_name: view-prod

    ports:
      - "5000:5000"

    volumes:
      - ./instance:/app/instance

    environment:
      - FLASK_ENV=production

    restart: unless-stopped
```

### 3️⃣ 启动容器

```bash
docker compose up -d
```

访问：

```
http://localhost:5000
```

---

## 🎵 Docker 版本音乐与配置说明

* **音乐文件**
* 待开发

---

## 🛠️ 技术栈

* Backend：Flask
* Frontend：HTML / CSS / JavaScript
* Deployment：Docker / Docker Compose

---

## 📌 适合人群

* 想要 **专注学习环境** 的学生
* 喜欢 **本地音乐 + 计时** 的极简学习党
* 希望 **快速部署、不折腾环境** 的用户

---
