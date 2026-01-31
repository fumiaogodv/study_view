
---

## 📚 Study View

一个集 **学习计时 / 日历管理 / 本地音乐播放** 于一体的轻量级学习辅助 Web 应用，基于 **Flask** 开发，支持 **Python 直接运行** 和 **Docker 一键部署**。

---

## ✨ 功能特性

* 🎧 **本地音乐播放**

  * 支持播放自定义音乐
  * 支持歌曲背景视频与播放器封面
  * 学习时自动营造专注氛围

* ⏱️ **学习计时**

  * 记录学习时长
  * 帮助培养稳定的学习节奏

* 📅 **学习日历**

  * 可视化学习记录
  * 方便回顾与规划

* 🔐 **管理员管理界面**

  * 音乐资源与展示内容统一管理
  * 支持歌曲背景视频与播放器封面增删

---

## 🚀 运行方式一：Python 直接运行（推荐开发 / 本地使用）

### 1️⃣ 下载项目代码

```bash
git clone https://github.com/fumiaogodv/study_view.git
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

## 🔐 管理员界面说明

管理员后台用于管理 **音乐相关展示资源**。

* 后台地址：

```
http://<IP>:5000/admin
```

* 默认管理员账号：

```
用户名：admin
密码：123456
```

### 管理功能

* 🎵 **歌曲背景视频管理**

  * 支持新增与删除
* 🖼️ **播放器封面管理**

  * 支持新增与删除
  * ⚠️ 封面图片文件名必须为：

```
img.png
```

否则将无法正常显示。

> ⚠️ 出于安全考虑，**强烈建议部署后自行修改管理员密码**。

---

## 🎵 Docker 版本音乐与配置说明

* **音乐文件**

  * 可通过更新镜像或挂载目录的方式添加新音乐
* **设置与数据**

  * `instance` 目录用于数据持久化
  * 升级新版本时可保留已有配置与学习记录

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


你这项目已经很像「正经可持续更新的个人作品」了 👍
