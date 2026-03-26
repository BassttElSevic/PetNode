# ──────────────────────────────────────────────────────────────
# flask_server/Dockerfile —— Flask 数据服务器容器镜像构建说明
#
# 用途：
#   将 flask_server/ 目录下的 Flask 数据服务器打包成 Docker 镜像，
#   作为独立的 S端容器运行，接收 Engine 容器通过 HTTP 发来的数据。
#
# 构建上下文 (context)：
#   需要在 C_end_Simulator/ 目录下执行构建（与 engine/Dockerfile 一致）
#   - 通过 docker compose build flask-server 自动构建
#   - 或手动: docker build -f flask_server/Dockerfile -t petnode-flask .
#
# 与 Engine 容器的关系：
#   - Engine 容器（客户端）通过 HTTP POST 发送数据
#   - 本容器（服务端）监听 5000 端口接收数据
#   - 两者是完全独立的容器，只通过 Docker 网络通信（老师要求！）
#
# ENTRYPOINT + CMD 设计（与 engine/Dockerfile 保持一致的风格）：
#   - ENTRYPOINT 固定为 python app.py（始终运行 Flask 服务器）
#   - 通过环境变��� PORT / DATA_DIR 控制运行参数
# ──────────────────────────────────────────────────────────────

# 基础镜像：Python 3.12 精简版（与 Engine 保持一致）
FROM python:3.12-slim

# 镜像元信息标签
LABEL maintainer="PetNode Team"
LABEL description="PetNode S端 Flask 数据服务器"

# 设置工作目录（所有后续操作相对于 /app）
WORKDIR /app

# ── 第 1 步：安装 Python 依赖 ──
# 先复制 requirements.txt，利用 Docker 缓存层
# 只要 requirements.txt 没变，就不会重新 pip install（加速迭代构建）
COPY flask_server/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# ── 第 2 步：复制 Flask 源码 ──
# 复制 flask_server/ 下所有文件（app.py + storage/）
COPY flask_server/ /app/flask_server/

# ── 第 3 步：创建数据目录 ──
# Flask 接收到的数据保存在容器内的 /app/data/（FileStorage 默认路径）
RUN mkdir -p /app/data

# ── 第 4 步：设置环境变量 ──
# PYTHONUNBUFFERED=1: 禁用 Python 输出缓冲（确保日志实时输出，与 Engine 一致）
# DATA_DIR: FileStorage 的数据存储目录
# PORT: Flask 监听端口
ENV PYTHONUNBUFFERED=1
ENV DATA_DIR=/app/data
ENV PORT=5000

# ── 第 5 步：暴露端口 ──
# 声明容器监听 5000 端口（文档作用，实际端口映射由 docker-compose 控制）
EXPOSE 5000

# ── 第 6 步：启动 Flask 服务器 ──
# 使用 python -m 运行，确保 flask_server 作为包被正确识别
# 这样 from flask_server.storage.file_storage import FileStorage 能正常工作
CMD ["python", "-m", "flask_server.app"]