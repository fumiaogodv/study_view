from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask import send_from_directory, make_response
import os

app = Flask(__name__)

# 数据库配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///study_data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


# --- 数据库模型 ---
class StudyRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(10), nullable=False, index=True)  # 格式: YYYY-MM-DD
    task_name = db.Column(db.String(100), nullable=False)
    duration = db.Column(db.Integer)
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date,
            "task_name": self.task_name,
            "duration": self.duration,
            "note": self.note
        }


# 初始化数据库
with app.app_context():
    db.create_all()


# --- 路由逻辑 ---

@app.route('/')
def index():
    return render_template('index.html')


# 1. 保存记录 (优化：强制使用 YYYY-MM-DD 字符串)
@app.route('/api/record', methods=['POST'])
def save_record():
    data = request.json
    try:
        # 核心改进：显式处理日期，确保存入数据库的格式统一
        record_date = data.get('date')
        if not record_date:
            record_date = datetime.now().strftime('%Y-%m-%d')

        new_record = StudyRecord(
            date=record_date,
            task_name=data.get('task_name', '未命名任务'),
            duration=data.get('duration', 0),
            note=data.get('note', '')
        )
        db.session.add(new_record)
        db.session.commit()
        return jsonify({"status": "success", "id": new_record.id}), 201
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
    # 过滤出所有 .aac 后缀的文件
    files = [f for f in os.listdir(music_dir) if f.endswith('.aac')]
    return jsonify(files)

# 建议使用这个路由来获取音乐文件，以确保正确的响应头
@app.route('/static/music/<path:filename>')
def serve_music(filename):
    # 使用 absolute 路径防止定位错误
    music_dir = os.path.join(app.static_folder, 'music')
    response = make_response(send_from_directory(music_dir, filename))

    # 1. 核心修复：强制设置为音频流
    response.headers['Content-Type'] = 'audio/aac'
    # 2. 核心修复：告诉浏览器这个文件应该“内联”显示，不要当成下载任务
    response.headers['Content-Disposition'] = 'inline'
    # 3. 允许断点续传，这对进度条获取时长非常重要
    response.headers['Accept-Ranges'] = 'bytes'

    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)