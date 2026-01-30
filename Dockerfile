FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

COPY . .

ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# 用 gunicorn 启动
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
