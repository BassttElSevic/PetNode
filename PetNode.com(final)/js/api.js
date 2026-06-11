/**
 * api.js —— PetNode 前端 API 网络层
 *
 * 连接后端 Flask 服务器的统一接口。
 *
 * 环境判断：
 *   - 开发环境（localhost 打开）→ 直连 Flask 5000 端口
 *   - 生产环境（nginx 反代）   → 通过 /api/ 前缀访问
 *   - 可手动设置 localStorage.petnode_api_base 覆盖
 */

(function () {
  'use strict';

  // ──────────────────────────────
  // 基础 URL 检测
  // ──────────────────────────────

  function detectBaseURL() {
    // 1. 手动覆盖
    const overridden = localStorage.getItem('petnode_api_base');
    if (overridden) return overridden;

    // 2. 如果页面本身是从 5000 端口提供的（Flask 直接托管）
    if (window.location.port === '5000') {
      return window.location.origin + '/api/v1';
    }

    // 3. 如果当前页面是 localhost / 127.0.0.1（开发时用 live-server 打开前端）
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/api/v1';
    }

    // 4. 生产环境——通过 nginx 反代（前端静态文件由 nginx 托管，/api/ 转发到 Flask）
    return '/api/v1';
  }

  const BASE_URL = detectBaseURL();
  console.log('[PetNode API] Base URL:', BASE_URL);

  // ──────────────────────────────
  // Token 管理
  // ──────────────────────────────

  function getToken() {
    return localStorage.getItem('petnode_access_token');
  }

  function setToken(token) {
    localStorage.setItem('petnode_access_token', token);
  }

  function removeToken() {
    localStorage.removeItem('petnode_access_token');
    localStorage.removeItem('petnode_admin_token');
  }

  // ──────────────────────────────
  // 核心请求函数
  // ──────────────────────────────

  async function request(url, options = {}) {
    const { method = 'GET', body, params, headers: extraHeaders = {}, raw } = options;

    // 拼接 query string
    let fullUrl = BASE_URL + url;
    if (params) {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (qs) fullUrl += '?' + qs;
    }

    // 构建 headers
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(fullUrl, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      // 401 → token 失效
      if (res.status === 401) {
        removeToken();
        console.warn('[PetNode API] Token 已失效，请重新登录');
        // 触发自定义事件，供页面监听
        window.dispatchEvent(new CustomEvent('petnode:auth:expired'));
        throw new Error('登录已过期，请重新登录');
      }

      // 解析响应
      const data = await res.json();

      if (!res.ok) {
        const msg = data.message || data.error || `请求失败 (${res.status})`;
        throw new Error(msg);
      }

      // 后端统一返回 { status: "ok", data: ..., code: 0 }
      // 也可能直接返回数据
      return raw ? data : (data.data !== undefined ? data.data : data);
    } catch (err) {
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        console.error('[PetNode API] 网络连接失败，后端服务可能未启动:', BASE_URL);
        throw new Error('无法连接到服务器，请检查后端是否启动');
      }
      throw err;
    }
  }

  // ──────────────────────────────
  // 公开方法
  // ──────────────────────────────

  window.PetNodeAPI = {
    /** 基础 URL */
    BASE_URL,

    /** Token 管理 */
    getToken,
    setToken,
    removeToken,

    /** HTTP 方法 */
    get(url, options) {
      return request(url, { method: 'GET', ...options });
    },
    post(url, body, options) {
      return request(url, { method: 'POST', body, ...options });
    },
    put(url, body, options) {
      return request(url, { method: 'PUT', body, ...options });
    },
    delete(url, options) {
      return request(url, { method: 'DELETE', ...options });
    },

    // ── 业务 API ──

    /** 健康检查 */
    health() {
      return this.get('/../health', { raw: true });
    },

    /** 获取最新遥测摘要 */
    getPetSummary(petId) {
      return this.get(`/pets/${petId}/summary`);
    },

    /** 心率时间序列 */
    getHeartRateSeries(petId, { start, end, limit } = {}) {
      return this.get(`/pets/${petId}/heart-rate/series`, { params: { start, end, limit } });
    },

    /** 呼吸频率时间序列 */
    getRespirationSeries(petId, { start, end, limit } = {}) {
      return this.get(`/pets/${petId}/respiration/series`, { params: { start, end, limit } });
    },

    /** 体温时间序列 */
    getTemperatureSeries(petId, { start, end, limit } = {}) {
      return this.get(`/pets/${petId}/temperature/series`, { params: { start, end, limit } });
    },

    /** 事件列表 */
    getPetEvents(petId, { cursor, limit, eventType, start, end } = {}) {
      return this.get(`/pets/${petId}/events`, {
        params: { cursor, limit, event_type: eventType, start, end },
      });
    },

    /** 当前用户信息 */
    getMe() {
      return this.get('/me');
    },

    /** 用户宠物列表 */
    getMyPets() {
      return this.get('/me/pets');
    },

    /** 查询遥测记录（统一查询接口） */
    queryRecords({ userId, deviceId, source, kind, start, end, limit, offset } = {}) {
      return this.get('/records', {
        params: { user_id: userId, device_id: deviceId, source, kind, start_time: start, end_time: end, limit, offset },
      });
    },

    /** 管理员登录（在主页前端用硬编码校验，不调后端） */
    adminLogin(username, password) {
      // 前端本地校验，见 main.js
      return { success: username === 'Test_Endmin' && password === 'Endfiled_Best' };
    },
  };

  console.log('[PetNode API] 网络层已就绪');
})();
