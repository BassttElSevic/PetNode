#!/usr/bin/env python3
"""
test_https.py —— 测试 PetNode HTTPS 加密传输（nginx 反向代理 + 自签名证书）

测试场景：
  1. HTTPS 连接成功       → GET  https://<host>:443/api/health（verify=False），期望 200
  2. HTTPS 数据上传       → POST https://<host>:443/api/data（带 API Key + HMAC 签名），期望 200
  3. HTTP 80 端口重定向   → GET  http://<host>:80/api/health，期望 301/302 或连接被拒绝
  4. HTTP 5000 端口可用   → GET  http://<host>:5000/api/health，期望 200（向后兼容）
  5. HTTPS 无 API Key     → POST https://<host>:443/api/data（不带 Authorization），期望 401

用法：
  python scripts/test_https.py                           # 默认测 47.109.200.132
  python scripts/test_https.py --host 127.0.0.1          # 测本地
  python scripts/test_https.py --host 47.109.200.132 --port 443

注意：
  自签名证书不被系统信任，所有 HTTPS 请求均使用 verify=False 跳过证书验证
  阿里云安全组需要放行 443 端口才能从公网访问 HTTPS
"""

import argparse
import hashlib
import hmac
import json
import sys
import time

try:
    import requests
    import urllib3
except ImportError:
    print("❌ 缺少 requests 库: pip install requests")
    sys.exit(1)

# 禁用自签名证书的 InsecureRequestWarning 告警（避免刷屏）
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 默认使用的正确 API Key
_CORRECT_API_KEY = "petnode_secret_key_2026"

# 默认使用的正确 HMAC 密钥
_CORRECT_HMAC_KEY = "petnode_hmac_secret_2026"

# 测试用的最小合法请求体
_SAMPLE_PAYLOAD = {
    "user_id": "user_test_https",
    "device_id": "test_device_https",
    "timestamp": "2026-04-02T00:00:00",
    "behavior": "walking",
    "heart_rate": 80.0,
    "resp_rate": 20.0,
    "temperature": 38.5,
    "steps": 100,
    "battery": 100,
    "gps_lat": 29.57,
    "gps_lng": 106.45,
    "event": None,
    "event_phase": None,
}


def parse_args():
    parser = argparse.ArgumentParser(description="PetNode HTTPS 加密传输测试")
    parser.add_argument(
        "--host", default="47.109.200.132",
        help="服务器地址（默认 47.109.200.132）",
    )
    parser.add_argument(
        "--port", type=int, default=443,
        help="HTTPS 端口（默认 443）",
    )
    parser.add_argument(
        "--api-key", default=_CORRECT_API_KEY,
        help="正确的 API Key",
    )
    parser.add_argument(
        "--hmac-key", default=_CORRECT_HMAC_KEY,
        help="正确的 HMAC 密钥",
    )
    return parser.parse_args()


def calc_sig(body_bytes: bytes, hmac_key: str) -> str:
    """用 HMAC-SHA256 计算签名（与 Engine 端保持完全一致的算法）"""
    return hmac.new(
        hmac_key.encode("utf-8"),
        body_bytes,
        hashlib.sha256,
    ).hexdigest()


def make_body(payload: dict) -> bytes:
    """将 dict 序列化为 JSON bytes（sort_keys=True 保证 key 排序一致）"""
    return json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")


def run_test(name: str, func) -> bool:
    """运行单个测试，返回是否通过"""
    print("=" * 60)
    print(f"🧪 {name}")
    print("=" * 60)
    try:
        passed, detail = func()
        print(f"   状态码: {detail.get('status_code', '?')}")
        print(f"   响应体: {detail.get('body', '')}")
        if passed:
            print(f"\n   ✅ 通过\n")
        else:
            print(f"\n   ❌ 失败: {detail.get('reason', '未知原因')}\n")
        return passed
    except Exception as exc:
        print(f"   ❌ 测试执行异常: {exc}\n")
        return False


def main():
    args = parse_args()
    https_url = f"https://{args.host}:{args.port}"
    http_url = f"http://{args.host}"
    api_key = args.api_key
    hmac_key = args.hmac_key

    print(f"🔒 PetNode HTTPS 加密传输测试")
    print(f"   HTTPS 目标: {https_url}")
    print(f"   HTTP  目标: {http_url}\n")

    # ── 测试 1：HTTPS 连接成功 ──
    def test_https_health():
        """GET https://<host>:443/api/health，verify=False（自签名证书），期望 200"""
        resp = requests.get(
            f"{https_url}/api/health",
            verify=False,  # 自签名证书不被系统信任，跳过验证
            timeout=10,
        )
        ok = resp.status_code == 200
        reason = f"期望 200，实际 {resp.status_code}" if not ok else ""
        return ok, {"status_code": resp.status_code, "body": resp.text, "reason": reason}

    # ── 测试 2：HTTPS 数据上传（带 API Key + HMAC 签名）──
    def test_https_upload():
        """POST https://<host>:443/api/data，带认证头，期望 200"""
        body = make_body(_SAMPLE_PAYLOAD)
        sig = calc_sig(body, hmac_key)
        resp = requests.post(
            f"{https_url}/api/data",
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "X-Signature": sig,
            },
            verify=False,  # 自签名证书
            timeout=10,
        )
        ok = resp.status_code == 200
        reason = f"期望 200，实际 {resp.status_code}" if not ok else ""
        return ok, {"status_code": resp.status_code, "body": resp.text, "reason": reason}

    # ── 测试 3：HTTP 80 端口重定向或不可用 ──
    def test_http_redirect():
        """GET http://<host>:80/api/health，期望 301/302 重定向或连接被拒绝"""
        try:
            resp = requests.get(
                f"{http_url}:80/api/health",
                allow_redirects=False,  # 不跟随重定向，检查重定向响应本身
                timeout=10,
            )
            # 期望 301 或 302 重定向到 HTTPS
            ok = resp.status_code in (301, 302)
            if ok:
                location = resp.headers.get("Location", "")
                reason = f"重定向到: {location}"
            else:
                reason = f"期望 301/302，实际 {resp.status_code}"
            return ok, {"status_code": resp.status_code, "body": resp.text[:100], "reason": reason}
        except requests.exceptions.ConnectionError:
            # 连接被拒绝也算通过（说明 80 端口没有暴露 HTTP，只走 HTTPS）
            return True, {"status_code": "连接被拒绝", "body": "", "reason": "HTTP 端口不可用（符合预期）"}

    # ── 测试 4：HTTP 5000 端口仍可用（向后兼容）──
    def test_http_5000():
        """GET http://<host>:5000/api/health，期望 200（Flask 直连，向后兼容）"""
        resp = requests.get(
            f"{http_url}:5000/api/health",
            timeout=10,
        )
        ok = resp.status_code == 200
        reason = f"期望 200，实际 {resp.status_code}" if not ok else ""
        return ok, {"status_code": resp.status_code, "body": resp.text, "reason": reason}

    # ── 测试 5：HTTPS 无 API Key 被拒绝 ──
    def test_https_no_api_key():
        """POST https://<host>:443/api/data，不带 Authorization，期望 401"""
        body = make_body(_SAMPLE_PAYLOAD)
        sig = calc_sig(body, hmac_key)
        resp = requests.post(
            f"{https_url}/api/data",
            data=body,
            headers={
                "Content-Type": "application/json",
                # 故意不带 Authorization 头
                "X-Signature": sig,
            },
            verify=False,  # 自签名证书
            timeout=10,
        )
        ok = resp.status_code == 401
        reason = f"期望 401，实际 {resp.status_code}" if not ok else ""
        return ok, {"status_code": resp.status_code, "body": resp.text, "reason": reason}

    tests = [
        ("测试 1：HTTPS 连接成功 → 期望 200", test_https_health),
        ("测试 2：HTTPS 数据上传（带认证）→ 期望 200", test_https_upload),
        ("测试 3：HTTP 80 端口重定向或不可用 → 期望 301/302/拒绝", test_http_redirect),
        ("测试 4：HTTP 5000 端口仍可用 → 期望 200（向后兼容）", test_http_5000),
        ("测试 5：HTTPS 无 API Key 被拒绝 → 期望 401", test_https_no_api_key),
    ]

    results = []
    for name, func in tests:
        passed = run_test(name, func)
        results.append((name, passed))
        time.sleep(0.5)  # 每个测试之间等 0.5 秒，避免竞争

    # ── 打印汇总结果 ──
    print("=" * 60)
    print("📋 测试汇总")
    print("=" * 60)
    for name, passed in results:
        icon = "✅" if passed else "❌"
        print(f"   {icon} {name}")

    all_passed = all(p for _, p in results)
    print()
    if all_passed:
        print("🎉 全部通过！HTTPS 加密传输机制运行正常！")
        sys.exit(0)
    else:
        print("⚠️  部分测试未通过，请检查 nginx 和 SSL 证书配置")
        print("   提示：确认阿里云安全组已放行 443 端口")
        sys.exit(1)


if __name__ == "__main__":
    main()
