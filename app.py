from flask import Flask, render_template, request, jsonify,session,redirect
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask import send_from_directory, make_response
from werkzeug.utils import secure_filename
import os
from functools import wraps

app = Flask(__name__)

app.secret_key = 'your_secret_key_here' # 必须设置，用于加密session

# 设置你的管理员账号密码
ADMIN_USER = "admin"
ADMIN_PASS = "123456" # 建议正式使用时修改

# 数据库配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///study_data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


# --- 数据库模型 ---
class StudyRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(10), nullable=False, index=True)
    task_name = db.Column(db.String(100), nullable=False)

    # 🔥 核心修改：用秒
    duration_sec = db.Column(db.Integer, nullable=False, default=0)

    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date,
            "task_name": self.task_name,
            "duration_sec": self.duration_sec,
            "note": self.note
        }



# 初始化数据库
with app.app_context():
    db.create_all()


# --- 路由逻辑 ---



@app.route('/')
def index():
    return render_template('index.html')

# 正确写法
@app.route('/admin')
def admin_login_page():
    return render_template('login.html')


# 1. 保存记录 (优化：强制使用 YYYY-MM-DD 字符串)
@app.route('/api/record', methods=['POST'])
def save_record():
    data = request.json
    try:
        record_date = data.get('date') or datetime.now().strftime('%Y-%m-%d')

        duration_sec = int(data.get('duration_sec', 0))

        new_record = StudyRecord(
            date=record_date,
            task_name=data.get('task_name', '未命名任务'),
            duration_sec=duration_sec,   # 🔥 秒
            note=data.get('note', '')
        )

        db.session.add(new_record)
        db.session.commit()

        return jsonify({
            "status": "success",
            "id": new_record.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 400



# 2. 删除记录 (新增：方便清理 0 分钟数据)
@app.route('/api/record/<int:record_id>', methods=['DELETE'])
def delete_record(record_id):
    try:
        record = StudyRecord.query.get(record_id)
        if record:
            db.session.delete(record)
            db.session.commit()
            return jsonify({"status": "success"}), 200
        return jsonify({"status": "not found"}), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 400


# 3. 获取所有有记录的日期 (用于日历打卡显色)
@app.route('/api/recorded_dates', methods=['GET'])
def get_recorded_dates():
    # 按照日期排序返回，方便前端处理
    dates = db.session.query(StudyRecord.date).distinct().order_by(StudyRecord.date).all()
    return jsonify([d.date for d in dates])


# 4. 获取某一天的所有记录
@app.route('/api/records/<date>', methods=['GET'])
def get_records_by_date(date):
    records = StudyRecord.query.filter_by(date=date).order_by(StudyRecord.id.desc()).all()
    return jsonify([r.to_dict() for r in records])

@app.route('/api/music_list', methods=['GET'])
def get_music_list():
    music_dir = os.path.join(app.static_folder, 'music')
    # 过滤出所有 .mp3 文件
    files = [f for f in os.listdir(music_dir) if f.endswith('.mp3')]
    return jsonify(files)

# 通过这个路由提供音乐文件，确保响应头正确
@app.route('/static/music/<path:filename>')
def serve_music(filename):
    music_dir = os.path.join(app.static_folder, 'music')

    response = make_response(
        send_from_directory(music_dir, filename)
    )

    # 1️⃣ 正确的 mp3 MIME 类型
    response.headers['Content-Type'] = 'audio/mpeg'

    # 2️⃣ 内联播放（浏览器 audio 标签能直接播）
    response.headers['Content-Disposition'] = 'inline'

    # 3️⃣ 允许 Range 请求（进度条 / 拖动 / 获取时长 必须）
    response.headers['Accept-Ranges'] = 'bytes'

    return response

# 配置路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE = {
    'music': os.path.join(BASE_DIR, 'static/music'),
    'videos': os.path.join(BASE_DIR, 'static/videos'),
    'cover': os.path.join(BASE_DIR, 'static/cover')  # ✅ 新增这一行
}

# 确保目录存在
for path in STORAGE.values():
    os.makedirs(path, exist_ok=True)

# --- API 接口 ---

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({"msg": "未授权"}), 403
        return f(*args, **kwargs)
    return decorated_function

# 1. 获取文件列表
@app.route('/api/files/<type>', methods=['GET'])
@login_required
def list_files(type):
    if type not in STORAGE: return jsonify([]), 400
    files = os.listdir(STORAGE[type])
    return jsonify(files)

# 2. 上传文件
@app.route('/api/upload/<type>', methods=['POST'])
@login_required
def upload_file(type):
    if 'file' not in request.files: return "无文件", 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    file.save(os.path.join(STORAGE[type], filename))
    return jsonify({"msg": "上传成功"})

# 3. 删除文件
@app.route('/api/file/<type>/<filename>', methods=['DELETE'])
@login_required
def delete_file(type, filename):
    try:
        os.remove(os.path.join(STORAGE[type], filename))
        return jsonify({"msg": "已删除"})
    except Exception as e:
        return str(e), 500

# 4. 重命名文件
@app.route('/api/rename/<type>', methods=['POST'])
@login_required
def rename_file(type):
    data = request.json
    old_path = os.path.join(STORAGE[type], data['oldName'])
    new_path = os.path.join(STORAGE[type], data['newName'])
    os.rename(old_path, new_path)
    return jsonify({"msg": "更名成功"})

# 1. 登录验证接口（登录页面的 JS 会调用这个）
@app.route('/api/login', methods=['POST'])
def admin_login():
    data = request.json
    if data.get('username') == ADMIN_USER and data.get('password') == ADMIN_PASS:
        session['logged_in'] = True
        return jsonify({"success": True})
    return jsonify({"success": False, "msg": "账号或密码错误"}), 401

# 2. 管理面板主页（登录成功后跳转的地方）
@app.route('/admin/dashboard')
def admin_dashboard():
    # 这里检查 session
    if not session.get('logged_in'):
        return redirect('/admin') # 没登录就踢回登录页
    return render_template('admin.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)