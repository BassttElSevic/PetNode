"""
blueprints/admin.py —— 管理员接口

Endpoints
---------
POST /api/v1/admin/login
    管理员登录，返回 JWT access_token。
GET /api/v1/admin/stats
    返回仪表盘所需的聚合统计数据。
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, request

from ..auth import create_access_token, decode_token, require_auth
from ..db import get_db
from ..helpers import err, now_iso, ok

admin_bp = Blueprint("admin", __name__, url_prefix="/api/v1/admin")
logger = logging.getLogger("flask_server.admin")

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "Test_Endmin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Endfiled_Best")


@admin_bp.route("/login", methods=["POST"])
def admin_login():
    """POST /api/v1/admin/login

    Request body:
        {"username": "...", "password": "..."}

    Response data:
        access_token   JWT（7 天有效）
        user_id        管理员用户 ID
    """
    body = request.get_json(force=True, silent=True) or {}
    username = (body.get("username") or "").strip()
    password = (body.get("password") or "").strip()

    if not username or not password:
        return err(42201, "用户名和密码不能为空", 422)

    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        return err(40101, "用户名或密码错误", 401)

    user_id = f"admin_{username}"
    token = create_access_token(user_id)
    return ok({
        "access_token": token,
        "user_id": user_id,
        "username": username,
        "login_at": now_iso(),
    })


@admin_bp.route("/stats", methods=["GET"])
def get_stats():
    """GET /api/v1/admin/stats

    返回仪表盘聚合数据：设备数、心率分布、行为分布、近期事件等。
    公开接口，不需要认证。
    """
    db = get_db()

    # 活跃设备数（最近 10 分钟内有上报记录的设备）
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None)
    recent_cutoff = datetime.utcnow().replace(second=0, microsecond=0)
    try:
        recent = list(db["received_records"].aggregate([
            {"$match": {"timestamp": {"$gte": (recent_cutoff - timedelta(minutes=30)).isoformat()}}},
            {"$group": {"_id": "$device_id", "count": {"$sum": 1}}},
        ]))
    except Exception:
        recent = []

    active_devices = len(recent)
    total_records = sum(d["count"] for d in recent) if recent else 0

    # 心率分布（最近 100 条记录）
    try:
        latest_records = list(db["received_records"].find(
            {}, {"_id": 0}
        ).sort("_id", -1).limit(200))
    except Exception:
        latest_records = []

    # 统计心率区间
    hr_normal = 0
    hr_tachy = 0
    hr_low = 0
    hr_critical = 0
    behaviors = {"sleeping": 0, "resting": 0, "walking": 0, "running": 0}
    events_active = 0
    total_hr = 0.0
    total_rr = 0.0
    total_temp = 0.0
    total_steps = 0
    count = 0

    for r in latest_records:
        hr = r.get("heart_rate", 0) or 0
        behavior = r.get("behavior", "")
        event = r.get("event")

        if 60 <= hr <= 140:
            hr_normal += 1
        elif hr > 140:
            hr_tachy += 1
        elif hr < 60:
            hr_low += 1
        if hr > 180 or hr < 40:
            hr_critical += 1

        if behavior in behaviors:
            behaviors[behavior] += 1

        if event:
            events_active += 1

        total_hr += hr
        total_rr += r.get("resp_rate", 0) or 0
        total_temp += r.get("temperature", 0) or 0
        total_steps += r.get("steps", 0) or 0
        count += 1

    avg_hr = round(total_hr / count, 1) if count else 0
    avg_rr = round(total_rr / count, 1) if count else 0
    avg_temp = round(total_temp / count, 1) if count else 0
    avg_steps = round(total_steps / count) if count else 0

    # 按行为统计心率
    behavior_stats = {}
    for b in ["sleeping", "resting", "walking", "running"]:
        b_records = [r for r in latest_records if r.get("behavior") == b]
        if b_records:
            b_hr = sum(r.get("heart_rate", 0) or 0 for r in b_records) / len(b_records)
            behavior_stats[b] = {"count": len(b_records), "avg_hr": round(b_hr, 1)}
        else:
            behavior_stats[b] = {"count": 0, "avg_hr": 0}

    # 设备 - 从 device_id 前缀分组（模拟型号分布）
    device_ids = list(set(r.get("device_id", "") for r in latest_records if r.get("device_id")))
    device_count = len(device_ids)

    return ok({
        "active_devices": max(active_devices, device_count),
        "total_recent_records": total_records if total_records else count,
        "sample_count": count,
        "averages": {
            "heart_rate_bpm": avg_hr,
            "resp_rate_bpm": avg_rr,
            "temperature_c": avg_temp,
            "steps": avg_steps,
        },
        "heart_rate_distribution": {
            "normal_60_140": hr_normal,
            "tachycardia_over_140": hr_tachy,
            "low_under_60": hr_low,
            "critical": hr_critical,
        },
        "behavior_distribution": behaviors,
        "behavior_avg_hr": behavior_stats,
        "active_events": events_active,
        "device_ids": device_ids,
        "generated_at": now_iso(),
    })


@admin_bp.route("/devices/realtime", methods=["GET"])
def get_devices_realtime():
    """GET /api/v1/admin/devices/realtime

    返回所有活跃设备的最新一条遥测数据，用于实时监控面板。
    按最近上报时间倒序排列。
    """
    db = get_db()

    try:
        pipeline = [
            {"$sort": {"_id": -1}},
            {"$group": {
                "_id": "$device_id",
                "timestamp": {"$first": "$timestamp"},
                "heart_rate": {"$first": "$heart_rate"},
                "resp_rate": {"$first": "$resp_rate"},
                "temperature": {"$first": "$temperature"},
                "steps": {"$first": "$steps"},
                "battery": {"$first": "$battery"},
                "behavior": {"$first": "$behavior"},
                "gps_lat": {"$first": "$gps_lat"},
                "gps_lng": {"$first": "$gps_lng"},
                "event": {"$first": "$event"},
                "event_phase": {"$first": "$event_phase"},
            }},
            {"$sort": {"timestamp": -1}},
            {"$limit": 50},
        ]
        rows = list(db["received_records"].aggregate(pipeline))
    except Exception:
        rows = []

    # 尝试获取宠物名称
    pet_names = {}
    try:
        for p in db["user_pets"].find({}, {"_id": 0, "device_id": 1, "pet_name": 1}):
            pet_names[p["device_id"]] = p.get("pet_name", "")
    except Exception:
        pass

    devices = []
    for r in rows:
        did = r["_id"]
        devices.append({
            "device_id": did,
            "pet_name": pet_names.get(did, ""),
            "timestamp": r.get("timestamp"),
            "heart_rate": r.get("heart_rate"),
            "resp_rate": r.get("resp_rate"),
            "temperature": r.get("temperature"),
            "steps": r.get("steps"),
            "battery": r.get("battery"),
            "behavior": r.get("behavior"),
            "gps_lat": r.get("gps_lat"),
            "gps_lng": r.get("gps_lng"),
            "event": r.get("event"),
            "event_phase": r.get("event_phase"),
        })

    return ok({
        "count": len(devices),
        "devices": devices,
        "generated_at": now_iso(),
    })
