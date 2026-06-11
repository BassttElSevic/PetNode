# PetNode

**重庆大学明月科创实验班 · C端App设计项目制课程大项目**

PetNode 是一套完整的宠物智能项圈模拟与监控系统，通过 Docker 编排的微服务集群模拟 C 端设备生产数据，配合 Flask 服务器、MySQL/MongoDB 双存储层以及微信小程序前端，覆盖从 **数据产生 → 传输 → 持久化 → 前端消费** 的完整链路。

---

## 目录

- [项目结构](#项目结构)
- [技术架构概览](#技术架构概览)
- [服务组件说明](#服务组件说明)
- [一条数据的完整生命周期](#一条数据的完整生命周期)
- [完整 API 接口清单](#完整-api-接口清单)
  - [设备数据层（Engine → Flask）](#设备数据层engine--flask)
  - [微信端 API（微信小程序 → Flask）](#微信端-api微信小程序--flask)
  - [内部存储层（Flask → MySQL/MongoDB）](#内部存储层flask--mysqlmongodb)
- [数据库结构](#数据库结构)
  - [MySQL 规范化表结构](#mysql-规范化表结构)
  - [MongoDB 集合结构](#mongodb-集合结构)
- [接口联调注意事项](#接口联调注意事项)
- [Docker 部署指南](#docker-部署指南)
- [本地开发与测试](#本地开发与测试)

---

## 项目结构

```
PetNode/
├── C_end_Simulator/              # 核心模拟系统（后端 + 数据引擎）
│   ├── docker-compose.yml        # Docker 编排（6 个服务）
│   ├── engine/                   # 数据生成引擎（模拟狗项圈）
│   │   ├── main.py               # 主调度器，支持 HTTP / MQ 双通道上报
│   │   ├── exporters/            # 数据导出器（HTTP / MQ / File）
│   │   ├── models/               # 数据模型（SmartCollar、Record）
│   │   ├── traits/               # 特征生成器（心率、呼吸、体温等）
│   │   ├── events/               # 事件模拟（发烧、受伤）
│   │   └── Dockerfile
│   ├── flask_server/             # S端 Flask 数据服务器
│   │   ├── app.py                # 主应用 + 设备数据接收接口
│   │   ├── auth.py               # JWT 鉴权
│   │   ├── db.py                 # MongoDB 连接（vx API 用）
│   │   ├── mq_worker.py          # RabbitMQ 消费者
│   │   ├── blueprints/           # 微信端 API 蓝图
│   │   │   ├── wechat.py         # /api/v1/wechat/* 认证绑定
│   │   │   ├── users.py          # /api/v1/me 用户信息
│   │   │   ├── pets.py           # /api/v1/pets/* 宠物遥测
│   │   │   ├── devices.py        # /api/v1/devices/* 设备绑定
│   │   │   └── family.py         # /api/v1/family/* 家庭组
│   │   ├── services/             # 业务逻辑层
│   │   │   ├── identity.py       # 用户身份
│   │   │   ├── binding.py        # 设备/宠物绑定
│   │   │   ├── telemetry.py      # 遥测数据查询
│   │   │   └── family.py         # 家庭组逻辑
│   │   └── storage/              # 存储适配层
│   │       ├── mongo_storage.py  # MongoDB（全量实时数据）
│   │       └── mysql_storage.py  # MySQL（规范化档案+异常记录）
│   ├── ui_tui/                   # 终端监控 TUI（Textual）
│   ├── ui_gui/                   # 图形监控 GUI
│   └── tests/                    # 单元测试 + 集成测试
└── wechat/
    └── WeChat_miniprogram/       # 微信小程序前端
        ├── utils/api.js          # 统一 API 请求封装
        ├── pages/login/          # 微信登录页
        ├── pages/index/          # 宠物列表首页
        ├── pages/petDetail/      # 宠物详情（健康图表 + 地图）
        ├── pages/profile/        # 个人资料
        └── pages/health/         # 健康概览
```

---

## 技术架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Compose 编排                          │
│                                                                 │
│  ┌────────────┐   MQ推送    ┌─────────────┐                     │
│  │   engine   │──────────▶│  rabbitmq   │                     │
│  │（数据生成）  │            │（消息队列）  │                     │
│  └─────┬──────┘            └──────┬──────┘                     │
│        │ HTTP POST                │ AMQP消费                    │
│        │ /api/data                │                            │
│        ▼                          ▼                            │
│  ┌────────────────────────────────────────┐                    │
│  │          flask-server :5000            │                    │
│  │   ┌──────────────────────────────────┐ │                    │
│  │   │  设备数据层 (Engine数据入口)        │ │                    │
│  │   │  POST /api/data                  │ │                    │
│  │   │  GET  /api/records               │ │                    │
│  │   │  GET  /api/profile               │ │                    │
│  │   ├──────────────────────────────────┤ │                    │
│  │   │  微信端 API (vx Blueprint)         │ │ ◀── 微信小程序      │
│  │   │  /api/v1/wechat/*                │ │                    │
│  │   │  /api/v1/me                      │ │                    │
│  │   │  /api/v1/pets/*                  │ │                    │
│  │   │  /api/v1/devices/*               │ │                    │
│  │   │  /api/v1/family/*                │ │                    │
│  │   └──────────────────────────────────┘ │                    │
│  └────────┬───────────────────────────────┘                    │
│           │                                                     │
│    ┌──────┴───────┐                                             │
│    ▼              ▼                                             │
│ ┌──────┐     ┌────────┐                                         │
│ │mongo │     │ mysql  │                                         │
│ │:27017│     │ :3306  │                                         │
│ │全量实时│    │规范化档案│                                        │
│ │遥测数据│    │+异常记录│                                        │
│ └──────┘     └────────┘                                         │
│                                                                 │
│  ┌──────────────┐  （可选，按需交互式启动）                         │
│  │  tui         │  docker compose --profile tui run --rm tui   │
│  │  终端监控界面  │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
         ▲ 微信小程序通过 BASE_URL 访问 Flask API
         │ utils/api.js → http://<服务器IP>:5000/api/v1
```

---

## 服务组件说明

| 服务名 | 镜像/构建 | 端口 | 职责 |
|--------|----------|------|------|
| `rabbitmq` | `rabbitmq:3-management` | 5672 / 15672 | AMQP 消息队列；Engine → mq-worker |
| `mongodb` | `mongo:7` | 27017 | 全量实时遥测数据持久化（vx API 读写） |
| `mysql` | `mysql:8` | 3306 | 规范化档案（user/device/telemetry/event） |
| `flask-server` | 本地构建 | 5000 | HTTP API 服务器；接收设备数据 + 提供微信端 API |
| `mq-worker` | 本地构建（同 flask） | — | RabbitMQ 消费者；鉴权验签后写入 Mongo+MySQL |
| `engine` | 本地构建 | — | 模拟狗项圈，持续生成 JSON 数据并上报 |
| `tui` *(profile)* | 本地构建 | — | 终端可视化监控，按需启动 |

---

## 一条数据的完整生命周期

> 以下展示一条狗项圈上报数据从产生到被微信小程序用户查看的完整路径。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1：数据产生（Engine 容器）                                               │
│                                                                             │
│  SmartCollar.tick()                                                         │
│      → 生成 JSON record：                                                    │
│        {                                                                    │
│          "device_id": "109f156a015a",                                       │
│          "timestamp": "2025-06-01T00:01:00",                                │
│          "behavior": "sleeping",                                            │
│          "heart_rate": 66.2,                                                │
│          "resp_rate": 8.5,                                                  │
│          "temperature": 38.45,                                              │
│          "steps": 0,                                                        │
│          "battery": 100,                                                    │
│          "gps_lat": 29.57,                                                  │
│          "gps_lng": 106.45,                                                 │
│          "event": null,                                                     │
│          "event_phase": null                                                │
│        }                                                                    │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
              ┌─────────────────────┴──────────────────────┐
              │ EXPORT_BACKEND 决定路径                      │
              ▼                                            ▼
  ┌───────────────────────┐              ┌─────────────────────────────────┐
  │  STEP 2a：HTTP 模式    │              │  STEP 2b：MQ 模式                │
  │                       │              │                                 │
  │  HttpExporter          │              │  MqExporter                     │
  │  POST /api/data        │              │  → RabbitMQ queue               │
  │  Authorization: Bearer │              │    petnode.records              │
  │  X-Signature: HMAC-256 │              │  headers:                       │
  └───────────┬───────────┘              │    Authorization: Bearer        │
              │                          │    X-Signature: HMAC-256        │
              ▼                          └──────────────┬──────────────────┘
  ┌───────────────────────┐                             │
  │  STEP 3a：Flask 接收   │              ┌──────────────▼──────────────────┐
  │                       │              │  STEP 3b：mq-worker 消费         │
  │  @app.route("/api/data│              │                                 │
  │  ① 验 API Key         │              │  ① 验 API Key                   │
  │  ② 验 HMAC 签名        │              │  ② 验 HMAC 签名                  │
  │  ③ 解析 JSON           │              │  ③ 解析 JSON                    │
  │  ④ 双写存储层           │              │  ④ 双写存储层                    │
  └───────────┬───────────┘              └──────────────┬──────────────────┘
              │                                         │
              └─────────────────┬───────────────────────┘
                                │
              ┌─────────────────┴──────────────────────┐
              ▼                                        ▼
  ┌───────────────────────────┐        ┌───────────────────────────────────┐
  │  STEP 4a：MongoDB 写入     │        │  STEP 4b：MySQL 写入               │
  │                           │        │                                   │
  │  mongo_storage.save()     │        │  mysql_storage.save()             │
  │  → 集合 received_records  │        │  ① _resolve_user_id_from_record   │
  │  → 保存全量 JSON 文档      │        │     (历史兼容: 缺省时回退默认用户) │
  │  → 按设备/时间建索引        │        │  ② _ensure_device                 │
  │                           │        │     (upsert device 表)            │
  │  （vx API 实时遥测查询数据源）│        │  ③ 写 telemetry_record           │
  └───────────────────────────┘        │     (每字段一行)                   │
                                       │  ④ 若有 event：写/更新             │
                                       │     event_instance                │
                                       │  ⑤ 若是异常：写 anomaly_record     │
                                       └───────────────────────────────────┘
                                                        │
                                                        │
  ┌─────────────────────────────────────────────────────▼─────────────────┐
  │  STEP 5：微信小程序用户查询（完整登录 + 数据消费链路）                        │
  │                                                                        │
  │  ① 用户打开小程序                                                         │
  │     wx.login() → 获取 code                                              │
  │                                                                        │
  │  ② POST /api/v1/wechat/auth  { code }                                  │
  │     → 服务器调用微信 code2Session                                         │
  │     → 返回 wx_identity_token（10分钟有效）                                │
  │     → 若已绑定：同时返回 access_token（7天有效）                            │
  │                                                                        │
  │  ③ （首次）POST /api/v1/wechat/bind  { wx_identity_token }              │
  │     → 创建/绑定系统用户                                                   │
  │     → 返回 access_token                                                 │
  │                                                                        │
  │  ④ POST /api/v1/devices/bind  { pet_name, breed, weight, avatar_url }  │
  │     → 将设备绑定到当前用户（建立 user_pets 关联）                            │
  │     → 返回 pet_id、device_id                                            │
  │                                                                        │
  │  ⑤ GET /api/v1/pets  → 获取用户可访问宠物列表                              │
  │                                                                        │
  │  ⑥ GET /api/v1/pets/{pet_id}/summary  → 宠物概览                        │
  │                                                                        │
  │  ⑦ GET /api/v1/pets/{pet_id}/heart-rate/series  → 心率曲线             │
  │     GET /api/v1/pets/{pet_id}/respiration/series  → 呼吸曲线            │
  │     GET /api/v1/pets/{pet_id}/temperature/series  → 体温曲线            │
  │     GET /api/v1/pets/{pet_id}/location/latest  → 最新定位              │
  │                                                                        │
  │  ⑧ GET /api/v1/pets/{pet_id}/events  → 告警事件列表                     │
  │     PUT /api/v1/pets/{pet_id}/events/{event_id}/read  → 标记已读        │
  │                                                                        │
  │  微信小程序展示：地图定位 + 健康图表（心率/呼吸/体温折线图）                    │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 完整 API 接口清单

### 设备数据层（Engine → Flask）

> Engine 作为数据生产者，通过以下接口将模拟数据上报到 Flask 服务器。

| 方法 | 路径 | 鉴权方式 | 说明 |
|------|------|---------|------|
| `POST` | `/api/data` | Bearer API Key + HMAC-SHA256 签名 | 接收一条设备遥测数据（Engine 专用入口） |
| `GET` | `/api/health` | 无 | 服务健康检查，返回 `status: healthy` |
| `GET` | `/api/records` | 无 | 统一查询接口（`source=mongo\|mysql`, `kind=records\|anomalies\|profile`） |
| `GET` | `/api/v1/records` | 无 | 同上（v1 别名） |
| `GET` | `/api/users/<user_key>/records` | 无 | 按用户查询记录 |
| `GET` | `/api/v1/users/<user_key>/records` | 无 | 同上（v1 别名） |
| `GET` | `/api/devices/<device_key>/records` | 无 | 按设备查询记录 |
| `GET` | `/api/v1/devices/<device_key>/records` | 无 | 同上（v1 别名） |
| `GET` | `/api/profile` | 无 | 查询 MySQL 静态档案（user/device/trait/event 字典） |
| `GET` | `/api/v1/profile` | 无 | 同上（v1 别名） |

**`POST /api/data` 请求格式：**

```http
POST /api/data
Authorization: Bearer petnode_secret_key_2026
X-Signature: <HMAC-SHA256(request_body)>
Content-Type: application/json

{
  "device_id": "109f156a015a",
  "timestamp": "2025-06-01T00:01:00",
  "behavior": "sleeping",
  "heart_rate": 66.2,
  "resp_rate": 8.5,
  "temperature": 38.45,
  "steps": 0,
  "battery": 100,
  "gps_lat": 29.57,
  "gps_lng": 106.45,
  "event": null,
  "event_phase": null
}
```

---

### 微信端 API（微信小程序 → Flask）

> 所有 `/api/v1/*` 接口均使用 JWT Bearer 鉴权（`access_token`，7天有效）。
> 统一响应格式：`{"code": 0, "message": "ok", "data": {...}}`

#### 1. 微信认证模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| `POST` | `/api/v1/wechat/auth` | 无 | wx.login() code 换取微信身份票据；已绑定则同时返回 access_token |
| `POST` | `/api/v1/wechat/bind` | 可选 Bearer | 微信身份绑定系统用户；无 token 时自动创建新用户 |
| `POST` | `/api/v1/wechat/unbind` | ✅ Bearer | 解除当前用户微信绑定 |

**`POST /api/v1/wechat/auth`**

```
请求体：{ "code": "<wx.login()返回的临时code>" }
返回：
  未绑定：{ "is_bound": false, "wx_identity_token": "..." }
  已绑定：{ "is_bound": true, "wx_identity_token": "...", "access_token": "...", "user_id": "..." }
```

**`POST /api/v1/wechat/bind`**

```
请求体：{ "wx_identity_token": "<由/wechat/auth返回>" }
可选头：Authorization: Bearer <已有access_token>（用于绑定到现有账号）
返回：{ "bind_status": "bound"|"already_bound", "user_id": "...", "bound_at": "...", "access_token": "..." }
```

**`POST /api/v1/wechat/unbind`**

```
请求头：Authorization: Bearer <access_token>
返回：{ "unbind_status": "unbound"|"not_bound", "user_id": "...", "unbound_at": "..." }
```

---

#### 2. 用户信息模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| `GET` | `/api/v1/me` | ✅ Bearer | 查询当前用户基本信息 + 绑定宠物列表 |
| `PUT` | `/api/v1/me` | ✅ Bearer | 修改用户昵称/头像 |

**`GET /api/v1/me`**

```
返回：{
  "user_id": "...",
  "nickname": "...",
  "avatar_url": "...",
  "created_at": "...",
  "pets": [{ "device_id": "...", "pet_name": "..." }]
}
```

**`PUT /api/v1/me`**

```
请求体：{ "nickname": "新昵称", "avatar_url": "https://..." }  （至少提供一个）
返回：{ "user_id": "...", "nickname": "...", "avatar_url": "..." }
```

---

#### 3. 设备绑定模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| `POST` | `/api/v1/devices/bind` | ✅ Bearer | 认领设备（项圈），建立宠物档案 |
| `POST` | `/api/v1/devices/{device_id}/unbind` | ✅ Bearer | 解除设备绑定 |

**`POST /api/v1/devices/bind`**

```
请求体：{
  "device_id": "109f156a015a",  // 可空，空时后端按未认领设备分配
  "pet_name": "旺财",
  "breed": "金毛",
  "avatar_url": "https://...",
  "weight": 25.5
}
返回：{ "pet_id": "...", "device_id": "...", "bind_status": "bound", "added_at": "..." }
```

**`POST /api/v1/devices/{device_id}/unbind`**

```
路径参数：device_id
返回：{ "device_id": "...", "unbind_status": "unbound", "unbound_at": "..." }
```

---

#### 4. 宠物遥测模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| `GET` | `/api/v1/pets` | ✅ Bearer | 宠物列表（本人绑定 + 家庭共享） |
| `GET` | `/api/v1/pets/{pet_id}/summary` | ✅ Bearer | 宠物首页概览（最新快照） |
| `GET` | `/api/v1/pets/{pet_id}/respiration/latest` | ✅ Bearer | 最新呼吸频率 |
| `GET` | `/api/v1/pets/{pet_id}/respiration/series` | ✅ Bearer | 呼吸频率时序曲线 |
| `GET` | `/api/v1/pets/{pet_id}/heart-rate/latest` | ✅ Bearer | 最新心率 |
| `GET` | `/api/v1/pets/{pet_id}/heart-rate/series` | ✅ Bearer | 心率时序曲线 |
| `GET` | `/api/v1/pets/{pet_id}/temperature/series` | ✅ Bearer | 体温时序曲线 |
| `GET` | `/api/v1/pets/{pet_id}/location/latest` | ✅ Bearer | 最新 GPS 定位 |
| `GET` | `/api/v1/pets/{pet_id}/events` | ✅ Bearer | 告警事件分页列表 |
| `PUT` | `/api/v1/pets/{pet_id}/events/{event_id}/read` | ✅ Bearer | 标记告警已读（消除红点） |
| `PUT` | `/api/v1/pets/{pet_id}` | ✅ Bearer | 修改宠物档案（仅 owner） |

**时序接口公共查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `start` | string | — | 起始时间（ISO 8601），如 `2026-05-01T00:00:00` |
| `end` | string | — | 结束时间（ISO 8601） |
| `limit` | int | 50（最大 500） | 返回条数上限 |

**`GET /api/v1/pets/{pet_id}/summary` 返回示例：**

```json
{
  "pet_id": "109f156a015a",
  "dog_status": "sleeping",
  "latest_respiration_bpm": 8.5,
  "latest_heart_rate_bpm": 66.2,
  "current_event": null,
  "current_event_phase": null,
  "last_reported_at": "2025-06-01T00:01:00"
}
```

**`GET /api/v1/pets/{pet_id}/heart-rate/series` 返回示例：**

```json
{
  "pet_id": "109f156a015a",
  "unit": "bpm",
  "count": 50,
  "points": [
    { "ts": "2025-06-01T00:01:00", "value_bpm": 66.2 }
  ]
}
```

**`GET /api/v1/pets/{pet_id}/location/latest` 返回示例：**

```json
{ "lat": 29.57, "lng": 106.45, "ts": "2025-06-01T00:01:00" }
```

**`GET /api/v1/pets/{pet_id}/events` 查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `start` / `end` | string | 时间范围过滤 |
| `event_type` | string | 类型过滤（如 `fever` / `injury`） |
| `cursor` | string | 分页游标（上次返回的 `next_cursor`） |
| `limit` | int | 每页条数（默认 20，最大 100） |

---

#### 5. 家庭组模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| `POST` | `/api/v1/family` | ✅ Bearer | 创建家庭组（幂等） |
| `POST` | `/api/v1/family/invite` | ✅ Bearer | 生成邀请码（Owner 专用） |
| `POST` | `/api/v1/family/join` | ✅ Bearer | 扫码加入家庭 |
| `GET` | `/api/v1/family/members` | ✅ Bearer | 查看家庭成员列表 |
| `DELETE` | `/api/v1/family/members/{user_id}` | ✅ Bearer | Owner 踢人 / 成员主动退出 |

**`POST /api/v1/family/invite`**

```
请求体：{ "expires_in": 600 }  // 邀请码有效秒数，最低 60s
返回：{ "invite_token": "...", "expires_in": 600 }
```

**`POST /api/v1/family/join`**

```
请求体：{ "invite_token": "..." }
返回：{ "join_status": "joined"|"already_joined", "family_id": "..." }
```

**`GET /api/v1/family/members` 返回示例：**

```json
{
  "family_id": "abc123",
  "members": [
    { "user_id": "...", "nickname": "小明", "role": "owner" },
    { "user_id": "...", "nickname": "小红", "role": "member" }
  ]
}
```

---

### 内部存储层（Flask → MySQL/MongoDB）

| 方法 | 签名 | 说明 |
|------|------|------|
| `MySQLStorage.save(record)` | `record: dict` | 将扁平 JSON 拆分写入规范化表（user/device/telemetry/event；Engine record 不含 `user_id`，历史数据兼容另行处理） |
| `MySQLStorage.query_anomalies(...)` | `user_key, device_key, start_time, end_time, limit, offset` | 查询异常记录列表 |
| `MySQLStorage.query_profile(...)` | `user_key, device_key` | 查询静态档案（user/device/trait_type/event_type） |
| `MySQLStorage._resolve_user_id_from_record(record, now)` | 内部方法 | 历史兼容入口：仅对旧数据或补录记录做 `user_id` 回填；Engine 新上报 record 不需要 `user_id` |
| `MySQLStorage._ensure_device(device_sn, now, user_id)` | 内部方法 | 设备 upsert（device_sn → device_id BIGINT 稳定映射；`user_id` 仅用于 Flask 绑定/归属域，不属于 Engine 载荷） |
| `MongoStorage.save(record)` | `record: dict` | 写入 `received_records` 集合 |
| `MongoStorage.query_records(...)` | `user_id, device_id, start_time, end_time, limit, offset` | 按条件查询遥测记录 |

---

## 数据库结构

### MySQL 规范化表结构

```
user                        设备档案用户（引擎默认用户 ID=1）
  user_id BIGINT PK
  username / nick_name / password_hash / phone
  create_time / update_time

device                      物理设备（device_sn = 引擎上报的 device_id 字符串）
  device_id BIGINT PK        （由 SHA-256(device_sn) 稳定生成）
  user_id BIGINT             绑定的用户（兼容/归属字段；Engine record 不携带）
  device_sn VARCHAR(50)      唯一索引
  device_name / pet_name / is_online / activate_time

说明：Engine 上报的 record 只包含设备遥测字段，不携带 `user_id`；MySQL 层仅对历史数据或补录场景做兼容处理，真正的绑定关系由 `user_pets` / `wechat_bindings` 维护。

trait_type                  指标类型字典（自动预填）
  trait_type_id 1=heart_rate, 2=resp_rate, 3=temperature, 4=steps
               5=battery, 6=gps_lat, 7=gps_lng, 8=behavior

device_trait                设备启用的指标
  device_id + trait_type_id PK

event_type                  事件类型字典
  fever(1级2) / injury(1级1)

event_instance              事件实例（onset→peak→recovery 自动状态机）
  event_instance_id BIGINT AUTO_INCREMENT PK
  device_id / event_type_id / status(0=closed,1=active)
  event_content / start_time / end_time

telemetry_record            遥测数据（每条 JSON 拆成 N 条，每字段一行）
  record_id BIGINT AUTO_INCREMENT PK
  user_id / device_id / event_instance_id
  trait_type_id / trait_value / timestamp

anomaly_record              异常记录（发烧/受伤等事件触发时写入）
  anomaly_id / user_id / device_id / event_instance_id
  anomaly_code / anomaly_detail JSON / record_timestamp
```

### MongoDB 集合结构

```
received_records            全量实时遥测数据（原始 JSON 文档，完整保留）
  device_id / timestamp / behavior
  heart_rate / resp_rate / temperature / steps / battery
  gps_lat / gps_lng / event / event_phase

users                       vx API 用户（UUID 主键）
  user_id / nickname / avatar_url / created_at

wechat_bindings             微信 openid/unionid ↔ user_id 映射
  openid / unionid / user_id / bound_at

user_pets                   设备 ↔ 用户 绑定关系
  user_id / device_id / pet_name / breed / avatar_url / weight / added_at

families                    家庭组
  family_id / owner_user_id / created_at

family_members              家庭成员
  family_id / user_id / role(owner/member) / joined_at

family_invites              邀请码
  invite_token / family_id / owner_user_id / expires_at
```

---

## 接口联调注意事项

1. **BASE_URL 配置**：微信小程序 `utils/api.js` 中 `BASE_URL = 'http://127.0.0.1:5000/api/v1'`，正式部署需改为服务器公网地址（如 `http://47.109.200.132:5000/api/v1`）。

2. **JWT Secret**：默认 `petnode_jwt_secret_2026`，可通过 `JWT_SECRET` 环境变量覆盖，生产环境必须修改为强随机密钥。

3. **微信 mock 模式**：未配置 `WECHAT_APP_ID`/`WECHAT_APP_SECRET` 时，`code2Session` 进入 mock 模式，`openid = mock_openid_{code前8位}`，适合开发调试。

4. **数据双写**：每条 Engine 数据同时写入 MongoDB（全量实时）和 MySQL（规范化档案+异常）。MySQL 写入失败不影响 MongoDB 写入（降级容错）。

5. **权限模型**：微信端通过 `user_pets` 集合判断用户是否有权访问某只宠物；家庭组成员通过 `family_members` 共享宠物数据访问权。

6. **API Key vs JWT**：
   - `POST /api/data`（Engine 专用）：使用固定 API Key + HMAC 签名鉴权
   - `/api/v1/*`（微信端）：使用 JWT Bearer Token 鉴权

---

## Docker 部署指南

### 前置要求

- Docker Engine ≥ 24.0
- Docker Compose ≥ 2.20
- 服务器开放端口：`5000`（API）、`27017`（MongoDB 调试）、`3306`（MySQL 调试，可选）、`15672`（RabbitMQ 管理台，可选）

### 1. 克隆并进入目录

```bash
git clone https://github.com/BassttElSevic/PetNode.git
cd PetNode/C_end_Simulator
```

### 2. 配置环境（按需修改 docker-compose.yml）

关键环境变量（`flask-server` 和 `mq-worker` 服务下）：

```yaml
environment:
  # 微信小程序必须配置（否则走 mock 模式）
  - WECHAT_APP_ID=your_wechat_app_id
  - WECHAT_APP_SECRET=your_wechat_app_secret

  # 生产环境强烈建议修改以下三个密钥
  - JWT_SECRET=your_strong_random_jwt_secret
  - API_KEY=your_strong_api_key
  - HMAC_KEY=your_strong_hmac_key
```

微信小程序同步修改 `utils/api.js`：

```javascript
const BASE_URL = 'http://<你的服务器IP>:5000/api/v1';
```

### 3. 构建并启动所有服务（推荐方式）

```bash
# 后台启动全部服务（rabbitmq、mongodb、mysql、flask-server、mq-worker、engine）
docker compose up -d

# 查看启动状态（等待所有服务变为 healthy/running）
docker compose ps

# 查看 flask-server 日志
docker compose logs -f flask-server

# 查看引擎日志
docker compose logs -f engine

# 查看 mq-worker 日志
docker compose logs -f mq-worker
```

### 4. 按需分步启动（调试时）

```bash
# 仅启动数据库服务
docker compose up -d rabbitmq mongodb mysql

# 等待数据库 healthy 后启动 Flask + mq-worker
docker compose up -d flask-server mq-worker

# 验证 Flask 健康
curl http://localhost:5000/api/health

# 再启动 Engine（引擎依赖 flask-server healthy）
docker compose up -d engine
```

### 5. 启动 TUI 终端监控（可选）

```bash
docker compose --profile tui run --rm tui
```

### 6. 常用运维命令

```bash
# 停止所有服务
docker compose down

# 停止并删除数据卷（清空所有数据）
docker compose down -v

# 重启单个服务（不重建镜像）
docker compose restart flask-server

# 强制重建镜像后启动
docker compose up -d --build flask-server

# 进入 MySQL 容器执行 SQL
docker exec -it petnode-mysql mysql -u petnode_user -ppetnode_password_2026 petnode

# 进入 MongoDB 容器查询
docker exec -it petnode-mongodb mongosh petnode

# 查看 RabbitMQ 管理台
# 浏览器打开 http://<服务器IP>:15672，默认账号 guest/guest

# 备份 MySQL 数据
docker exec petnode-mysql mysqldump -u petnode_user -ppetnode_password_2026 petnode > backup_$(date +%Y%m%d).sql

# 恢复 MySQL 数据
docker exec -i petnode-mysql mysql -u petnode_user -ppetnode_password_2026 petnode < backup.sql
```

### 7. 服务启动顺序与健康依赖

```
rabbitmq (healthy)
    ↓
mongodb (healthy)
    ↓
mysql (healthy)
    ↓
flask-server (healthy, GET /api/health 返回 200)
    ↓
mq-worker (started)
    ↓
engine (started)
```

### 8. 常见问题排查

| 问题 | 排查方法 |
|------|---------|
| Engine 无法连接 Flask | `docker compose logs engine` 查看是否等待 flask-server healthy |
| MySQL 连接失败 | `docker compose logs mysql`，检查密码是否与环境变量一致 |
| 微信登录失败 | 检查 `WECHAT_APP_ID`/`WECHAT_APP_SECRET` 是否正确；开发时可用 mock 模式 |
| JWT 无效 | `JWT_SECRET` 环境变量需 flask-server 和微信端使用同一配置 |
| RabbitMQ 队列积压 | 访问 http://IP:15672 查看队列状态，检查 mq-worker 日志 |
| 数据只进 MongoDB 不进 MySQL | `docker compose logs flask-server` 查看 MySQL 持久化警告日志 |

---

## 本地开发与测试

```bash
cd C_end_Simulator

# 安装依赖
pip install -r flask_server/requirements.txt
pip install -r engine/requirements.txt

# 运行测试（不需要真实 Docker 环境）
python -m pytest -m "not docker" --ignore=ui_gui -q

# 运行 vx API 与服务层测试（使用 mongomock，无需真实 MongoDB）
python -m pytest tests/test_vx_api.py tests/test_internal_services.py -v

# 仅运行 vx API 测试
python -m pytest tests/test_vx_api.py -v
```

---

> 如有问题，欢迎提 Issue 或联系项目维护者。
