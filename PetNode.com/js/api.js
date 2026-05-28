/**
 * PetNode API 通信模块
 * 统一管理后端 API 调用，包括 Token 存储、请求封装、错误处理。
 */
const Api = (() => {
  const BASE_URL = 'http://127.0.0.1:5000';
  const TOKEN_KEY = 'petnode_admin_token';

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

  async function request(method, path, body) {
    const url = BASE_URL + path;
    const headers = { 'Content-Type': 'application/json' };

    const token = getToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    const config = { method, headers };
    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url, config);
    } catch (err) {
      throw new ApiError(0, '无法连接到服务器 (' + BASE_URL + ')', err);
    }

    let data;
    try {
      data = await res.json();
    } catch (_) {
      throw new ApiError(res.status, '服务器返回了非 JSON 响应 (HTTP ' + res.status + ')', null);
    }

    const code = data.code !== undefined ? data.code : (data.status === 'ok' ? 0 : -1);

    if (code !== 0) {
      const msg = data.message || data.msg || '请求失败';
      if (code === 40101 || res.status === 401) {
        clearToken();
      }
      throw new ApiError(code, msg, data);
    }

    return data.data !== undefined ? data.data : data;
  }

  class ApiError extends Error {
    constructor(code, message, detail) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
      this.detail = detail;
    }
  }

  return {
    BASE_URL,
    getToken,
    isLoggedIn,
    clearToken,
    ApiError,

    /** 管理员登录 */
    async adminLogin(username, password) {
      const data = await request('POST', '/api/v1/admin/login', { username, password });
      if (data.access_token) {
        setToken(data.access_token);
      }
      return data;
    },

    /** 获取仪表盘聚合统计数据 */
    async getStats() {
      return await request('GET', '/api/v1/admin/stats');
    },

    /** 获取所有活跃设备实时数据 */
    async getDevicesRealtime() {
      return await request('GET', '/api/v1/admin/devices/realtime');
    },

    /** 健康检查 */
    async healthCheck() {
      return await request('GET', '/api/health');
    }
  };
})();
