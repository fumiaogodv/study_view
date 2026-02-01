FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

COPY . .

ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV STUDY_ADMIN_USER=admin
ENV STUDY_ADMIN_PASS=123456
ENV FLASK_SECRET_KEY=temporary_secret

RUN cp -r /app/static /app/static_backup

# 拷贝启动脚本
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 使用脚本启动
ENTRYPOINT ["/entrypoint.sh"]

# 用 gunicorn 启动
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
