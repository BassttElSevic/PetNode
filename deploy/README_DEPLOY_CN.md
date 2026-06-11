# PetNode 部署说明（中文）

## 固定部署信息
- 服务器 IP：`47.108.239.80`
- 域名：`pppetnode.com`
- DNS 托管：Cloudflare（开启代理/橙色云图标）

## 1) Docker Compose 启动（在 `C_end_Simulator` 下）
```bash
cd /path/to/PetNode/C_end_Simulator
docker compose up -d
```

## 2) Nginx 反向代理配置
仓库内配置文件：
- `/path/to/PetNode/deploy/nginx/pppetnode.com.conf`

部署到服务器时，建议放置到：
- `/etc/nginx/conf.d/pppetnode.com.conf`

先申请 TLS 证书（示例：Certbot）：
```bash
certbot --nginx -d pppetnode.com -d www.pppetnode.com
```

校验并重载 Nginx：
```bash
nginx -t && systemctl reload nginx
```

## 2.1) Cloudflare 设置要求

域名托管到 Cloudflare 后，**必须**检查以下设置：

### SSL/TLS 模式（最重要！）
进入 Cloudflare 面板 → SSL/TLS → Overview，选择：
- **推荐：Full (Strict)** — CF 到源站走 HTTPS，要求源站有有效证书（Let's Encrypt 即可）
- **Full** — CF 到源站走 HTTPS，不校验证书有效性
- **⚠️ 切勿使用 Flexible** — 虽然 Nginx 已兼容此模式，但安全性较差

### DNS 记录
- A 记录：`pppetnode.com` → `47.108.239.80`（Proxy status: Proxied 橙色云）
- CNAME 或 A 记录：`www.pppetnode.com` → 同上（Proxied）

### 其他推荐设置
- SSL/TLS → Edge Certificates → Always Use HTTPS: **开启**
- SSL/TLS → Edge Certificates → Minimum TLS Version: **TLS 1.2**
- Speed → Optimization → Auto Minify: 按需开启（JS/CSS/HTML）

### 故障排查
如果网站返回 **ERR_TOO_MANY_REDIRECTS** 或 **重定向次数过多**：
1. 首先检查 Cloudflare SSL/TLS 模式是否设置为 Full 或 Full (Strict)
2. 清除浏览器 Cookie
3. 在 Cloudflare 中暂停代理（灰色云）测试直连是否正常

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
