# PetNode 部署说明（中文）

## 固定部署信息
- 服务器 IP：`47.108.239.80`
- 域名：`pppetnode.com`
- DNS 托管：Cloudflare（代理模式 / 橙色云朵）

## 1) Docker Compose 启动（在 `C_end_Simulator` 下）
```bash
cd /path/to/PetNode/C_end_Simulator
docker compose up -d
```

## 2) Cloudflare 设置（重要！）

### 2.1 SSL/TLS 模式
在 Cloudflare Dashboard → SSL/TLS → Overview 中，将加密模式设置为：
- **Full (Strict)**（推荐）—— Cloudflare 通过 HTTPS 回源，并验证源站证书

> ⚠️ **强烈建议使用 "Full (Strict)" 模式**。虽然当前 Nginx 配置已兼容 Flexible 模式（不会产生无限跳转），
> 但 Flexible 模式下 Cloudflare→源站之间为明文 HTTP，存在安全风险。

### 2.2 生成 Cloudflare Origin Certificate（推荐）
1. Cloudflare Dashboard → SSL/TLS → Origin Server → **Create Certificate**
2. 保持默认设置（RSA 2048，15 年有效期），点击 Create
3. 将生成的证书和私钥保存到服务器：
   ```bash
   mkdir -p /etc/ssl/cloudflare
   # 将证书内容粘贴保存为：
   nano /etc/ssl/cloudflare/pppetnode.com.pem
   # 将私钥内容粘贴保存为：
   nano /etc/ssl/cloudflare/pppetnode.com.key
   chmod 600 /etc/ssl/cloudflare/pppetnode.com.key
   ```

### 2.3 Cloudflare DNS 记录
确保以下记录存在且为 **Proxied（橙色云朵）**：
| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|----------|
| A | `pppetnode.com` | `47.108.239.80` | Proxied |
| A | `www` | `47.108.239.80` | Proxied |

### 2.4 其他推荐设置
- SSL/TLS → Edge Certificates → Always Use HTTPS: **开启**
- SSL/TLS → Edge Certificates → Minimum TLS Version: **TLS 1.2**
- Speed → Optimization → Auto Minify: 可开启 JS/CSS/HTML

## 3) Nginx 反向代理配置
仓库内配置文件：
- `/path/to/PetNode/deploy/nginx/pppetnode.com.conf`

部署到服务器时，建议放置到：
- `/etc/nginx/conf.d/pppetnode.com.conf`

> 注意：当前配置已适配 Cloudflare 代理模式，使用 Cloudflare Origin Certificate 而非 Let's Encrypt。
> 如果你之前使用 Let's Encrypt，修改 Nginx 配置中的证书路径指向 Cloudflare Origin Certificate。

校验并重载 Nginx：
```bash
nginx -t && systemctl reload nginx
```

## 3) 微信小程序 API 基地址
小程序 `wechat/WeChat_miniprogram/utils/api.js` 的 `BASE_URL` 应为：
- `https://pppetnode.com/api/v1`

## 4) 必须替换的敏感配置项
请在 `C_end_Simulator/docker-compose.yml` 中替换以下占位值：
- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`
- `JWT_SECRET`
- `API_KEY`
- `HMAC_KEY`
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DEFAULT_PASSWORD_HASH`

说明：
- `API_KEY` 与 `HMAC_KEY` 在 `flask-server`、`mq-worker`、`engine` 三处必须保持一致。
- `MYSQL_DEFAULT_PASSWORD_HASH` 需填写你希望设置的默认密码对应的 SHA-256 十六进制哈希值（与当前项目字段格式保持一致）。
- 示例生成命令：`echo -n 'your_password' | sha256sum | awk '{print $1}'`
- `WECHAT_APP_ID` / `WECHAT_APP_SECRET` 可在微信小程序管理后台（开发设置）获取。

## 5) 基础连通性验证
```bash
curl https://pppetnode.com/api/health
```
说明： 健康检查接口是 `/api/health`（非 `/api/v1/health`）。  
期望结果：`HTTP 200` 且返回健康状态 JSON。  
如返回健康状态（HTTP 200）即说明 Nginx -> Flask 转发链路可用。

### 绕过 Cloudflare 直接测试源站
如果通过域名访问失败，先直接用 IP 测试源站是否正常：
```bash
# 直接测试 Nginx → Flask 是否通（绕过 Cloudflare）
curl -k https://47.108.239.80/api/health -H "Host: pppetnode.com"

# 或者直接测试 Flask 容器端口
curl http://47.108.239.80:5000/api/health
```

## 6) 常见问题排查（Cloudflare 相关）

| 现象 | 原因 | 解决方案 |
|------|------|----------|
| ERR_TOO_MANY_REDIRECTS | Cloudflare SSL 为 Flexible，Nginx 又 301→HTTPS | 将 Cloudflare SSL 改为 **Full (Strict)** |
| 502 Bad Gateway | Cloudflare 无法连接源站 443 端口 | 检查：1) Nginx 是否运行 2) 防火墙是否放行 443 3) SSL 证书路径是否正确 |
| 521 Web Server Is Down | 源站完全不响应 | 检查 Nginx 是否启动：`systemctl status nginx` |
| 525 SSL Handshake Failed | 源站证书无效或过期 | 重新生成 Cloudflare Origin Certificate 并配置到 Nginx |
| API 本地正常但线上 404 | Nginx 未正确转发 /api/ | 检查 Nginx 配置中 `location /api/` 是否存在，Flask 容器是否运行 |
| CORS 错误 | Cloudflare 可能缓存了预检请求 | 在 Cloudflare 清除缓存，或在 Rules 中对 /api/* 设置"跳过缓存" |

### 防火墙注意事项
服务器防火墙需放行以下端口：
- **80** (HTTP) —— Cloudflare 回源 + Let's Encrypt 续期
- **443** (HTTPS) —— Cloudflare 回源（Full/Full Strict 模式）

建议：仅允许 Cloudflare IP 访问 80/443，屏蔽其他来源（防止绕过 CDN 直连源站）。
Cloudflare IP 列表：https://www.cloudflare.com/ips/
