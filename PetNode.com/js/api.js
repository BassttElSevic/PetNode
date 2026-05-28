/**
 * PetNode API 通信模块
 *
 * 统一管理后端 API 调用，包括 Token 存储、请求封装、错误处理。
 *
 * 使用方式：
 *   Api.login(username, password).then(data => ...)
 *   Api.getStats().then(data => ...)
 */

const Api = (() => {
    // ── 配置 ──
    const BASE_URL = "http://127.0.0.1:5000";

    // ── Token 管理 ──
    const TOKEN_KEY = "petnode_admin_token";

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
    }

    function clearToken() {
        localStorage.removeItem(TOKEN_KEY);
    }

    function isLoggedIn() {
        return !!getToken();
    }

    // ── 通用请求封装 ──
    async function request(method, path, body, options = {}) {
        const url = BASE_URL + path;
        const headers = { "Content-Type": "application/json" };

        // 如果已登录，自动附加 Bearer token
        const token = getToken();
        if (token) {
            headers["Authorization"] = "Bearer " + token;
        }

        const config = { method, headers };

        if (body && method !== "GET") {
            config.body = JSON.stringify(body);
        }

        let res;
        try {
            res = await fetch(url, config);
        } catch (err) {
            // 网络错误（服务器不可达等）
            throw new ApiError(0, "无法连接到服务器 (" + BASE_URL + ")", err);
        }

        let data;
        try {
            data = await res.json();
        } catch (_) {
            throw new ApiError(res.status, "服务器返回了非 JSON 响应 (HTTP " + res.status + ")", null);
        }

        // 响应可能是 vx API 信封格式 或 旧格式
        const code = data.code !== undefined ? data.code : (data.status === "ok" ? 0 : -1);

        if (code !== 0) {
            const msg = data.message || data.msg || "请求失败";
            const err = new ApiError(code, msg, data);
            // 如果是 401，自动清除过期 token
            if (code === 40101 || res.status === 401) {
                clearToken();
            }
            throw err;
        }

        // 统一返回 data 字段（vx 信封）或整个响应体（旧格式）
        return data.data !== undefined ? data.data : data;
    }

    // ── 自定义错误类 ──
    class ApiError extends Error {
        constructor(code, message, detail) {
            super(message);
            this.name = "ApiError";
            this.code = code;
            this.detail = detail;
        }
    }

    // ── 公开 API ──

    return {
        BASE_URL,
        getToken,
        isLoggedIn,
        clearToken,

        // ─── 管理员 ───

        /** 管理员登录 */
        async adminLogin(username, password) {
            const data = await request("POST", "/api/v1/admin/login", {
                username: username,
                password: password,
            });
            if (data.access_token) {
                setToken(data.access_token);
            }
            return data;
        },

        /** 获取仪表盘聚合统计数据 */
        async getStats() {
            return await request("GET", "/api/v1/admin/stats");
        },

        /** 健康检查 */
        async healthCheck() {
            return await request("GET", "/api/health");
        },

        // ─── 设备数据查询 ───

        /** 查询最近记录 */
        async getRecentRecords(limit = 100) {
            return await request("GET", "/api/records?limit=" + limit + "&source=mongo");
        },

        /** 按设备查询记录 */
        async getDeviceRecords(deviceId, limit = 50) {
            return await request("GET", "/api/devices/" + encodeURIComponent(deviceId) + "/records?limit=" + limit + "&source=mongo");
        },

        /** 查询活跃设备列表 */
        async getActiveDevices() {
            const resp = await request("GET", "/api/records?limit=500&source=mongo");
            const records = resp.data || [];
            const seen = {};
            const devices = [];
            for (const r of records) {
                const did = r.device_id;
                if (did && !seen[did]) {
                    seen[did] = true;
                    devices.push({
                        device_id: did,
                        last_behavior: r.behavior,
                        last_heart_rate: r.heart_rate,
                        last_timestamp: r.timestamp,
                    });
                }
                if (devices.length >= 20) break;
            }
            return devices;
        },

        ApiError,
    };
})();
