#!/bin/bash
# ──────────────────────────────────────────────────────────────
# generate_cert.sh —— 生成自签名 SSL 证书（开发/测试环境用）
#
# 用途：
#   在 nginx 容器启动时自动生成自签名 SSL 证书，用于 HTTPS 加密传输。
#   仅用于开发/测试环境，生产环境应使用 Let's Encrypt 等 CA 签发的证书。
#
# 生成的文件：
#   /etc/nginx/ssl/server.crt  —— 自签名证书（公钥 + 证书信息）
#   /etc/nginx/ssl/server.key  —— 私钥（保密！不要泄漏）
#
# 证书信息：
#   C=CN  (Country: 中国)
#   ST=Chongqing  (State: 重庆)
#   L=Chongqing   (Locality: 重庆)
#   O=PetNode     (Organization: PetNode)
#   CN=petnode.local  (Common Name: 本地开发域名)
# ──────────────────────────────────────────────────────────────

# 确保 ssl 目录存在
mkdir -p /etc/nginx/ssl

# 检查证书是否已存在，避免重复生成
if [ -f /etc/nginx/ssl/server.crt ] && [ -f /etc/nginx/ssl/server.key ]; then
    echo "✅ SSL 证书已存在，跳过生成"
    exit 0
fi

echo "🔐 正在生成自签名 SSL 证书..."

# 生成自签名 SSL 证书
# -x509        : 生成自签名证书（而不是 CSR 请求）
# -nodes       : 不加密私钥（no DES encryption，方便自动启动）
# -days 365    : 证书有效期 365 天
# -newkey rsa:2048 : 生成 2048 位 RSA 密钥对
# -keyout      : 私钥输出路径
# -out         : 证书输出路径
# -subj        : 证书主题（避免交互式输入）
openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/server.key \
    -out /etc/nginx/ssl/server.crt \
    -subj "/C=CN/ST=Chongqing/L=Chongqing/O=PetNode/CN=petnode.local"

if [ $? -eq 0 ]; then
    echo "✅ SSL 证书生成成功"
    echo "   证书: /etc/nginx/ssl/server.crt"
    echo "   私钥: /etc/nginx/ssl/server.key"
else
    echo "❌ SSL 证书生成失败"
    exit 1
fi
