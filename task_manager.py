"""任务管理模块"""
import json
import os

# 任务列表文件路径
TASKS_FILE = os.path.join('data', 'tasks.json')

def load_tasks():
    """从JSON文件加载任务列表"""
    try:
        if os.path.exists(TASKS_FILE):
            with open(TASKS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            # 如果文件不存在，创建默认任务列表
            default_tasks = ['高等数学', '英语学习', '编程练习', '阅读书籍']
            save_tasks(default_tasks)
            return default_tasks
    except Exception as e:
        print(f"加载任务列表失败: {e}")
        return ['高等数学', '英语学习', '编程练习', '阅读书籍']

def save_tasks(tasks):
    """保存任务列表到JSON文件"""
    try:
        # 确保data目录存在
        os.makedirs(os.path.dirname(TASKS_FILE), exist_ok=True)
        with open(TASKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(tasks, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"保存任务列表失败: {e}")