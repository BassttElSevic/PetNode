# ──────────────────────────────────────────────────────────────
# nginx/Dockerfile —— nginx 反向代理容器镜像构建说明
#
# 用途：
#   在 nginx:alpine 基础上，添加 openssl 和自签名证书生成脚本，
#   作为 SSL 终结层，将 HTTPS 请求转发给 Flask 服务器（HTTP）。
#
# 构建上下文 (context)：
#   需要在 C_end_Simulator/ 目录下执行构建
#   - 通过 docker compose build nginx 自动构建
#   - 或手动: docker build -f nginx/Dockerfile -t petnode-nginx .
#
# 启动流程：
#   1. 容器启动时，entrypoint 脚本检查证书是否存在
#   2. 如果证书不存在，调用 generate_cert.sh 生成自签名证书
#   3. 证书生成完毕后，启动 nginx 服务
#
# 注意：
#   自签名证书仅用于开发/测试环境
#   生产环境应挂载 Let's Encrypt 等 CA 签发的证书
# ──────────────────────────────────────────────────────────────

# 基础镜像：nginx 官方 Alpine 精简版（体积小、启动快）
FROM nginx:alpine

# 镜像元信息标签
LABEL maintainer="PetNode Team"
LABEL description="PetNode nginx 反向代理（SSL 终结层）"

# ── 第 1 步：安装 openssl（用于生成自签名证书）──
# Alpine 默认不带 openssl，需要手动安装
RUN apk add --no-cache openssl

# ── 第 2 步：创建 SSL 证书目录 ──
RUN mkdir -p /etc/nginx/ssl

# ── 第 3 步：复制 nginx 配置文件 ──
# 替换 nginx 默认配置（/etc/nginx/conf.d/default.conf）
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# ── 第 4 步：复制证书生成脚本 ──
COPY nginx/generate_cert.sh /generate_cert.sh
# 赋予执行权限
RUN chmod +x /generate_cert.sh

# ── 第 5 步：创建启动脚本（先生成证书，再启动 nginx）──
# 使用 shell 脚本而非直接 CMD，以便先执行证书生成再启动 nginx
RUN printf '#!/bin/sh\n/generate_cert.sh && nginx -g "daemon off;"\n' \
    > /entrypoint.sh && chmod +x /entrypoint.sh

# 暴露 HTTP 和 HTTPS 端口
EXPOSE 80 443

# 启动：先生成证书（如不存在），再以前台模式运行 nginx
CMD ["/entrypoint.sh"]
