# PetNode

**重庆大学明月科创实验班 · C端App设计项目制课程大项目**

PetNode 是一套完整的宠物智能项圈模拟与监控系统，通过 Docker 编排的微服务集群模拟 C 端设备生产数据，配合 Flask 服务器、MySQL/MongoDB 双存储层、微信小程序前端以及管理后台，覆盖从 **数据产生 → 传输 → 持久化 → 前端消费 → 管理监控** 的完整链路。

---

## 目录

- [项目结构](#项目结构)
- [技术架构概览](#技术架构概览)
- [服务组件说明](#服务组件说明)
- [一条数据的完整生命周期](#一条数据的完整生命周期)
- [完整 API 接口清单](#完整-api-接口清单)
  - [设备数据层（Engine → Flask）](#设备数据层engine--flask)
  - [微信端 API（微信小程序 → Flask）](#微信端-api微信小程序--flask)
  - [管理端 API（Admin Dashboard → Flask）](#管理端-apiadmin-dashboard--flask)
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
├── C_end_Simulator/              # 核心模拟系统（后端 + 数据引擎 + 监控 UI）
│   ├── docker-compose.yml        # Docker 编排（7 个服务）
│   ├── Jenkinsfile               # Jenkins CI/CD 流水线
│   ├── pytest.ini                # 测试配置
│   ├── run_demo.sh               # 一键演示脚本
│   ├── verify_network.sh         # 网络连通性验证
│   ├── engine/                   # 数据生成引擎（模拟狗项圈）
│   │   ├── main.py               # 主调度器，多线程数据生成 + 指令轮询
│   │   ├── models/               # 数据模型
│   │   │   ├── dog_profile.py    # 犬只长期档案（品种/年龄/GPS基线）
│   │   │   └── smart_collar.py   # 智能项圈（OOP封装，每tick生成1条record）
│   │   ├── traits/               # 慢性病特征修正器
│   │   │   ├── base_trait.py     # 基类（5组修正 + 漂移机制）
│   │   │   ├── cardiac.py        # 心脏病风险（HR+10, 波动×1.2）
│   │   │   ├── respiratory.py    # 呼吸道风险（RR+4, 波动×1.2）
│   │   │   └── ortho.py          # 骨科风险（步数×0.75, 受伤概率×2）
│   │   ├── events/               # 急性事件模拟（状态机驱动）
│   │   │   ├── base_event.py     # 基类（EventPhase: onset→peak→recovery）
│   │   │   ├── event_manager.py  # 事件管理器（每日概率触发）
│   │   │   ├── fever.py          # 发烧事件（体温+1.5°C, HR+15bpm）
│   │   │   └── injury.py         # 受伤事件（步数≈0, GPS静止）
│   │   ├── exporters/            # 数据导出器（策略模式）
│   │   │   ├── base_exporter.py  # 导出器基类 ABC
│   │   │   ├── file_exporter.py  # JSONL 文件导出
│   │   │   ├── http_exporter.py  # HTTP POST 导出（API Key + HMAC签名）
│   │   │   └── mq_exporter.py    # RabbitMQ 发布（AMQP）
│   │   ├── listeners/            # 指令接收器
│   │   │   ├── base_listener.py  # 监听器基类 ABC
│   │   │   ├── dummy_listener.py # 哑监听器（无服务器连接）
│   │   │   └── ws_listener.py    # WebSocket 监听器（预留）
│   │   └── Dockerfile
│   ├── flask_server/             # S端 Flask 数据服务器
│   │   ├── app.py                # 主应用（设备数据接收 + 查询接口）
│   │   ├── auth.py               # JWT 鉴权（生成/验证 access_token）
│   │   ├── db.py                 # MongoDB 连接管理
│   │   ├── helpers.py            # 工具函数（响应封装/时间处理）
│   │   ├── mq_worker.py          # RabbitMQ 消费者（验签+双写入库）
│   │   ├── blueprints/           # API 蓝图
│   │   │   ├── wechat.py         # /api/v1/wechat/* 微信认证绑定
│   │   │   ├── users.py          # /api/v1/me 用户信息
│   │   │   ├── pets.py           # /api/v1/pets/* 宠物遥测
│   │   │   ├── devices.py        # /api/v1/devices/* 设备绑定
│   │   │   ├── family.py         # /api/v1/family/* 家庭组
│   │   │   └── admin.py          # /api/v1/admin/* 管理后台
│   │   ├── services/             # 业务逻辑层
│   │   │   ├── identity.py       # 用户身份标识 & 哈希
│   │   │   ├── binding.py        # 设备/宠物绑定 & 权限校验
│   │   │   ├── telemetry.py      # 遥测数据查询 & 事件管理
│   │   │   └── family.py         # 家庭组逻辑
│   │   ├── storage/              # 存储适配层（策略模式）
│   │   │   ├── base_storage.py   # 存储基类 ABC
│   │   │   ├── file_storage.py   # JSONL 文件持久化
│   │   │   ├── mongo_storage.py  # MongoDB（全量实时数据）
│   │   │   └── mysql_storage.py  # MySQL（规范化档案+异常记录）
│   │   └── Dockerfile
│   ├── ui_tui/                   # 终端监控 TUI（Textual 框架）
│   │   ├── app.py                # TUI 入口
│   │   ├── Dockerfile
│   │   ├── backend/              # TUI 后端通信
│   │   │   ├── command_api.py    # 指令 API（TUI→Engine）
│   │   │   ├── data_api.py       # 数据 API（读取实时流）
│   │   │   └── user_store.py     # 本地会话存储
│   │   └── screens/              # TUI 界面
│   │       ├── login_screen.py   # 登录界面
│   │       └── dashboard_screen.py # 监控仪表盘
│   ├── ui_gui/                   # 桌面图形监控 GUI（PyQt6）
│   │   ├── app.py                # GUI 入口
│   │   ├── login_window.py       # 登录窗口
│   │   ├── register_window.py    # 注册窗口
│   │   ├── ForgetPassword_window.py # 找回密码窗口
│   │   └── main_window.py        # 主监控窗口
│   ├── output_data/              # Engine ↔ TUI/GUI 共享通信目录
│   │   ├── realtime_stream.jsonl # 实时数据流（Engine→UI）
│   │   ├── command.json          # 控制指令（UI→Engine）
│   │   └── engine_status.json    # 引擎运行状态
│   ├── tests/                    # 测试套件
│   │   ├── test_step1_data_generation.py  # 数据生成单元测试
│   │   ├── test_step2_file_exporter.py    # 文件导出测试
│   │   ├── test_step3_scheduler.py        # 调度器集成测试
│   │   ├── test_step4_docker_build.py     # Docker 构建测试
│   │   ├── test_step4_module_health.py    # 模块健康检查
│   │   ├── test_step4_multithreading.py   # 多线程测试
│   │   ├── test_step5_tui_backend.py      # TUI 后端测试
│   │   ├── test_vx_api.py                 # 微信 API 集成测试
│   │   └── test_internal_services.py      # 内部服务单元测试
│   └── scripts/                  # 辅助脚本
│       └── demo_classroom.py     # 课堂演示脚本
├── PetNode.com(final)/           # 官网 + 管理后台（静态前端）
│   ├── index.html                # 产品官网首页
│   ├── admin.html                # 管理后台仪表盘
│   ├── css/                      # 样式文件
│   │   ├── global.css            # 全局样式
│   │   └── main.css              # 主样式
│   ├── js/                       # 脚本文件
│   │   ├── main.js               # 首页逻辑
│   │   ├── api.js                # API 集成层
│   │   └── components.js         # 组件工具
│   └── assets/                   # 静态资源
│       ├── images/               # 产品图片/头像
│       └── icons/                # 功能图标
├── wechat/
│   └── WeChat_miniprogram/       # 微信小程序前端
│       ├── app.js                # 全局入口
│       ├── app.json              # 小程序配置（13个页面）
│       ├── utils/api.js          # 统一 API 请求封装
│       ├── components/           # 自定义组件
│       │   └── navigation-bar/   # 自定义导航栏
│       ├── images/               # 图片资源
│       └── pages/                # 页面（共13个）
│           ├── index/            # 宠物列表首页
│           ├── login/            # 微信登录
│           ├── petDetail/        # 宠物详情（健康图表+地图）
│           ├── health/           # 健康概览
│           ├── profile/          # 个人资料
│           ├── settings/         # 应用设置
│           ├── deviceManage/     # 设备管理
│           ├── multiDevice/      # 多设备切换
│           ├── familyManage/     # 家庭组管理
│           ├── consumables/      # 耗材/配件
│           ├── joke/             # 趣味内容
│           ├── inviteRemark/     # 邀请备注
│           └── inviteShare/      # 邀请分享
└── deploy/                       # 部署配置
    ├── README_DEPLOY_CN.md       # 部署指南（中文）
    └── nginx/
        └── pppetnode.com.conf    # Nginx 反向代理配置
```

---

## 技术架构概览

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        Docker Compose 编排                                      │
│                                                                                │
│  ┌────────────┐   AMQP推送    ┌─────────────┐                                 │
│  │   engine   │──────────────▶│  rabbitmq   │                                 │
│  │（数据生成）  │              │（消息队列）  │                                 │
│  └─────┬──────┘              └──────┬──────┘                                 │
│        │ HTTP POST                  │ AMQP消费                                │
│        │ /api/data                  │                                         │
│        ▼                            ▼                                         │
│  ┌────────────────────────────────────────────────┐                           │
│  │            flask-server :5000                  │                           │
│  │   ┌──────────────────────────────────────────┐ │                           │
│  │   │  设备数据层 (Engine数据入口)                │ │                           │
│  │   │  POST /api/data                          │ │                           │
│  │   │  GET  /api/records                       │ │                           │
│  │   │  GET  /api/profile                       │ │                           │
│  │   ├──────────────────────────────────────────┤ │                           │
│  │   │  微信端 API (vx Blueprint)                │ │ ◀── 微信小程序             │
│  │   │  /api/v1/wechat/*                        │ │                           │
│  │   │  /api/v1/me                              │ │                           │
│  │   │  /api/v1/pets/*                          │ │                           │
│  │   │  /api/v1/devices/*                       │ │                           │
│  │   │  /api/v1/family/*                        │ │                           │
│  │   ├──────────────────────────────────────────┤ │                           │
│  │   │  管理端 API (Admin Blueprint)             │ │ ◀── 管理后台              │
│  │   │  /api/v1/admin/*                         │ │     (admin.html)          │
│  │   └──────────────────────────────────────────┘ │                           │
│  └────────┬───────────────────────────────────────┘                           │
│           │                                                                    │
│    ┌──────┴───────┐                                                            │
│    ▼              ▼                                                            │
│ ┌──────┐     ┌────────┐                                                       │
│ │mongo │     │ mysql  │                                                       │
│ │:27017│     │ :3306  │                                                       │
│ │全量实时│    │规范化档案│                                                      │
│ │遥测数据│    │+异常记录│                                                      │
│ └──────┘     └────────┘                                                       │
│                                                                                │
│  ┌──────────────┐  （可选，按需交互式启动）                                       │
│  │  tui         │  docker compose --profile tui run --rm tui                  │
│  │  终端监控界面  │                                                             │
│  └──────────────┘                                                             │
└────────────────────────────────────────────────────────────────────────────────┘
         ▲ 微信小程序              ▲ 管理后台
         │ utils/api.js            │ PetNode.com(final)/admin.html
         │ → Flask /api/v1         │ → Flask /api/v1/admin
         │                         │
    ┌────┴────────────────────┐    │
    │  Nginx 反向代理           │────┘
    │  pppetnode.com :443      │
    │  /api/ → Flask :5000     │
    │  /    → 静态前端          │
    └──────────────────────────┘
```

---

## 服务组件说明

| 服务名 | 镜像/构建 | 端口 | 职责 |
|--------|----------|------|------|
| `rabbitmq` | `rabbitmq:3-management` | 6200(AMQP) / 16200(管理台) | AMQP 消息队列；Engine → mq-worker |
| `mongodb` | `mongo:7` | 27017 | 全量实时遥测数据持久化（vx API + Admin API 读写） |
| `mysql` | `mysql:8` | 3306 | 规范化档案（user/device/telemetry/event） |
| `flask-server` | 本地构建 | 5000 | HTTP API 服务器；接收设备数据 + 微信端 API + 管理端 API |
| `mq-worker` | 本地构建（同 flask） | — | RabbitMQ 消费者；鉴权验签后写入 Mongo+MySQL |
| `engine` | 本地构建 | — | 模拟狗项圈（10只狗，1秒/tick），持续生成 JSON 数据并上报 |
| `tui` *(profile)* | 本地构建 | — | 终端可视化监控（Textual），按需启动 |

> **注意**：GUI（PyQt6 桌面应用）不在 Docker 编排中，需在宿主机直接运行 `python -m ui_gui.app`。

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
  │  STEP 2a：HTTP 模式    │              │  STEP 2b：MQ 模式（默认）         │
  │                       │              │                                 │
  │  HttpExporter          │              │  MqExporter                     │
  │  POST /api/data        │              │  → RabbitMQ queue               │
  │  Authorization: ******              │    petnode.records              │
  │  X-Signature: HMAC-256 │              │  headers:                       │
  └───────────┬───────────┘              │    Authorization: ******
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

  ┌────────────────────────────────────────────────────────────────────────┐
  │  STEP 6：管理后台监控（Admin Dashboard）                                  │
  │                                                                        │
  │  ① 管理员打开 admin.html                                                │
  │     POST /api/v1/admin/login  { username, password }                   │
  │     → 返回 access_token                                                │
  │                                                                        │
  │  ② GET /api/v1/admin/stats  → 仪表盘统计                               │
  │     （活跃设备数/心率分布/行为分布/平均指标/活跃事件）                        │
  │                                                                        │
  │  ③ GET /api/v1/admin/devices/realtime  → 实时设备列表                   │
  │     （所有活跃设备最新遥测快照）                                            │
  │                                                                        │
  │  ④ GET /api/v1/admin/devices/{device_id}/detail  → 设备详情            │
  │     （快照 + 心率/呼吸/体温序列 + 近期事件）                                │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 完整 API 接口清单

### 设备数据层（Engine → Flask）

> Engine 作为数据生产者，通过以下接口将模拟数据上报到 Flask 服务器。

| 方法 | 路径 | 鉴权方式 | 说明 |
|------|------|---------|------|
| `POST` | `/api/data` | ****** Key + HMAC-SHA256 签名 | 接收一条设备遥测数据（Engine 专用入口） |
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
Authorization: ******
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

> 所有 `/api/v1/*` 接口均使用 JWT ******
> 统一响应格式：`{"code": 0, "message": "ok", "data": {...}}`

#### 1. 微信认证模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| `POST` | `/api/v1/wechat/auth` | 无 | wx.login() code 换取微信身份票据；已绑定则同时返回 access_token |
| `POST` | `/api/v1/wechat/bind` | 可选 ****** 微信身份绑定系统用户；无 token 时自动创建新用户 |
| `POST` | `/api/v1/wechat/unbind` | ✅ ****** 解除当前用户微信绑定 |

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
可选头：Authorization: ******
返回：{ "bind_status": "bound"|"already_bound", "user_id": "...", "bound_at": "...", "access_token": "..." }
```

**`POST /api/v1/wechat/unbind`**

```
请求头：Authorization: ******
返回：{ "unbind_status": "unbound"|"not_bound", "user_id": "...", "unbound_at": "..." }
```

---

#### 2. 用户信息模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| `GET` | `/api/v1/me` | ✅ ****** 查询当前用户基本信息 + 绑定宠物列表 |
| `PUT` | `/api/v1/me` | ✅ ****** 修改用户昵称/头像 |

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
| `POST` | `/api/v1/devices/bind` | ✅ ****** 认领设备（项圈），建立宠物档案 |
| `POST` | `/api/v1/devices/{device_id}/unbind` | ✅ ****** 解除设备绑定 |

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
| `GET` | `/api/v1/pets` | ✅ ****** 宠物列表（本人绑定 + 家庭共享） |
| `GET` | `/api/v1/pets/{pet_id}/summary` | ✅ ****** 宠物首页概览（最新快照） |
| `GET` | `/api/v1/pets/{pet_id}/respiration/latest` | ✅ ****** 最新呼吸频率 |
| `GET` | `/api/v1/pets/{pet_id}/respiration/series` | ✅ ****** 呼吸频率时序曲线 |
| `GET` | `/api/v1/pets/{pet_id}/heart-rate/latest` | ✅ ****** 最新心率 |
| `GET` | `/api/v1/pets/{pet_id}/heart-rate/series` | ✅ ****** 心率时序曲线 |
| `GET` | `/api/v1/pets/{pet_id}/temperature/series` | ✅ ****** 体温时序曲线 |
| `GET` | `/api/v1/pets/{pet_id}/location/latest` | ✅ ****** 最新 GPS 定位 |
| `GET` | `/api/v1/pets/{pet_id}/events` | ✅ ****** 告警事件分页列表 |
| `PUT` | `/api/v1/pets/{pet_id}/events/{event_id}/read` | ✅ ****** 标记告警已读（消除红点） |
| `PUT` | `/api/v1/pets/{pet_id}` | ✅ ****** 修改宠物档案（仅 owner） |

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
| `POST` | `/api/v1/family` | ✅ ****** 创建家庭组（幂等） |
| `POST` | `/api/v1/family/invite` | ✅ ****** 生成邀请码（Owner 专用） |
| `POST` | `/api/v1/family/join` | ✅ ****** 扫码加入家庭 |
| `GET` | `/api/v1/family/members` | ✅ ****** 查看家庭成员列表 |
| `DELETE` | `/api/v1/family/members/{user_id}` | ✅ ****** Owner 踢人 / 成员主动退出 |

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

### 管理端 API（Admin Dashboard → Flask）

> 管理后台通过 `/api/v1/admin/*` 接口提供仪表盘统计和实时设备监控功能。

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| `POST` | `/api/v1/admin/login` | 无 | 管理员登录，返回 JWT access_token |
| `GET` | `/api/v1/admin/stats` | 无 | 仪表盘聚合统计（活跃设备/心率分布/行为分布/平均指标） |
| `GET` | `/api/v1/admin/devices/realtime` | 无 | 所有活跃设备的最新遥测快照（实时监控面板） |
| `GET` | `/api/v1/admin/devices/{device_id}/detail` | 无 | 单设备详情（快照+时序曲线+近期事件） |

**`POST /api/v1/admin/login`**

```
请求体：{ "username": "...", "password": "..." }
返回：{ "access_token": "...", "user_id": "admin_xxx", "username": "...", "login_at": "..." }
```

**`GET /api/v1/admin/stats` 返回示例：**

```json
{
  "active_devices": 10,
  "total_recent_records": 200,
  "sample_count": 200,
  "averages": {
    "heart_rate_bpm": 85.3,
    "resp_rate_bpm": 15.2,
    "temperature_c": 38.6,
    "steps": 120
  },
  "heart_rate_distribution": {
    "normal_60_140": 180,
    "tachycardia_over_140": 10,
    "low_under_60": 5,
    "critical": 2
  },
  "behavior_distribution": {
    "sleeping": 50,
    "resting": 60,
    "walking": 50,
    "running": 40
  },
  "behavior_avg_hr": {
    "sleeping": { "count": 50, "avg_hr": 65.2 },
    "running": { "count": 40, "avg_hr": 135.8 }
  },
  "active_events": 3,
  "device_ids": ["109f156a015a", "..."],
  "generated_at": "2025-06-01T00:05:00"
}
```

**`GET /api/v1/admin/devices/realtime` 返回示例：**

```json
{
  "count": 10,
  "devices": [
    {
      "device_id": "109f156a015a",
      "pet_name": "旺财",
      "timestamp": "2025-06-01T00:01:00",
      "heart_rate": 66.2,
      "resp_rate": 8.5,
      "temperature": 38.45,
      "steps": 0,
      "battery": 100,
      "behavior": "sleeping",
      "gps_lat": 29.57,
      "gps_lng": 106.45,
      "event": null,
      "event_phase": null
    }
  ],
  "generated_at": "2025-06-01T00:05:00"
}
```

**`GET /api/v1/admin/devices/{device_id}/detail` 返回示例：**

```json
{
  "device_id": "109f156a015a",
  "pet_name": "旺财",
  "latest": { "timestamp": "...", "heart_rate": 66.2, "..." : "..." },
  "heart_rate_series": { "unit": "bpm", "count": 50, "points": [...] },
  "respiration_series": { "unit": "bpm", "count": 50, "points": [...] },
  "temperature_series": { "unit": "°C", "count": 50, "points": [...] },
  "recent_events": [{ "ts": "...", "type": "fever", "phase": "onset", "behavior": "resting" }],
  "generated_at": "2025-06-01T00:05:00"
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

1. **BASE_URL 配置**：微信小程序 `utils/api.js` 中 `BASE_URL = 'http://127.0.0.1:5000'`，正式部署需改为服务器公网地址（如 `https://pppetnode.com`，通过 Nginx 反代）。

2. **JWT Secret**：通过 `JWT_SECRET` 环境变量配置，生产环境必须修改为强随机密钥。

3. **微信 mock 模式**：未配置 `WECHAT_APP_ID`/`WECHAT_APP_SECRET` 时，`code2Session` 进入 mock 模式，`openid = mock_openid_{code前8位}`，适合开发调试。

4. **数据双写**：每条 Engine 数据同时写入 MongoDB（全量实时）和 MySQL（规范化档案+异常）。MySQL 写入失败不影响 MongoDB 写入（降级容错）。

5. **权限模型**：微信端通过 `user_pets` 集合判断用户是否有权访问某只宠物；家庭组成员通过 `family_members` 共享宠物数据访问权。

6. **API Key vs JWT**：
   - `POST /api/data`（Engine 专用）：使用固定 API Key + HMAC 签名鉴权
   - `/api/v1/*`（微信端）：使用 JWT ****** 鉴权
   - `/api/v1/admin/*`（管理端）：登录后使用 JWT ******

7. **管理员账号**：通过 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 环境变量配置（默认为测试账号，生产环境必须修改）。

8. **三方密钥一致性**：`API_KEY` 和 `HMAC_KEY` 必须在 flask-server、mq-worker、engine 三个服务中保持一致。

---

## Docker 部署指南

### 前置要求

- Docker Engine ≥ 24.0
- Docker Compose ≥ 2.20
- 服务器开放端口：`5000`（API）、`27017`（MongoDB 调试）、`3306`（MySQL 调试，可选）、`16200`（RabbitMQ 管理台，可选）

### 1. 克隆并进入目录

```bash
git clone https://github.com/BassttElSevic/PetNode.git
cd PetNode/C_end_Simulator
```

### 2. 配置环境变量

在 `C_end_Simulator/` 目录下创建 `.env` 文件，或在 `docker-compose.yml` 中直接配置以下环境变量：

```bash
# 微信小程序（否则走 mock 模式）
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# 安全密钥（生产环境必须修改）
JWT_SECRET=your_strong_random_jwt_secret
API_KEY=your_strong_api_key
HMAC_KEY=your_strong_hmac_key

# MySQL 配置
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_USER=petnode_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_DEFAULT_PASSWORD_HASH=your_sha256_hash

# 管理员账号（可选，有默认值）
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
```

微信小程序同步修改 `wechat/WeChat_miniprogram/utils/api.js`：

```javascript
const BASE_URL = 'http://<你的服务器IP>:5000';
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
# 仅启动基础设施服务
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

### 6. 启动 GUI 桌面监控（宿主机运行）

```bash
cd C_end_Simulator
pip install -r ui_gui/requirements.txt
python -m ui_gui.app
```

### 7. 常用运维命令

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
docker exec -it petnode-mysql mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} petnode

# 进入 MongoDB 容器查询
docker exec -it petnode-mongodb mongosh petnode

# 查看 RabbitMQ 管理台
# 浏览器打开 http://<服务器IP>:16200，默认账号 guest/guest
```

### 8. 服务启动顺序与健康依赖

```
rabbitmq (healthy)
    ↓
mongodb (healthy)       mysql (healthy)
    ↓                       ↓
    └───────────┬───────────┘
                ▼
flask-server (healthy, GET /api/health 返回 200)
                ↓
mq-worker (started)
                ↓
engine (started, 依赖 flask-server healthy + rabbitmq healthy + mq-worker started)
```

### 9. 生产部署（Nginx + SSL）

项目已提供 Nginx 配置模板（`deploy/nginx/pppetnode.com.conf`）：

- 域名：`pppetnode.com`
- SSL：Let's Encrypt (Certbot)
- `/api/` 反向代理到 Flask `:5000`
- `/` 提供静态前端（`PetNode.com(final)/` 目录内容）
- 安全头：HSTS、X-Frame-Options、X-Content-Type-Options
- 静态资源 7 天浏览器缓存

### 10. 常见问题排查

| 问题 | 排查方法 |
|------|---------|
| Engine 无法连接 Flask | `docker compose logs engine` 查看是否等待 flask-server healthy |
| MySQL 连接失败 | `docker compose logs mysql`，检查密码是否与环境变量一致 |
| 微信登录失败 | 检查 `WECHAT_APP_ID`/`WECHAT_APP_SECRET` 是否正确；开发时可用 mock 模式 |
| JWT 无效 | `JWT_SECRET` 环境变量需 flask-server 和微信端使用同一配置 |
| RabbitMQ 队列积压 | 访问 http://IP:16200 查看队列状态，检查 mq-worker 日志 |
| 数据只进 MongoDB 不进 MySQL | `docker compose logs flask-server` 查看 MySQL 持久化警告日志 |
| 管理后台无法登录 | 检查 `ADMIN_USERNAME`/`ADMIN_PASSWORD` 环境变量 |

---

## 本地开发与测试

```bash
cd C_end_Simulator

# 安装依赖
pip install -r flask_server/requirements.txt
pip install -r engine/requirements.txt
pip install -r tests/requirements.txt

# 运行测试（不需要真实 Docker 环境）
python -m pytest -m "not docker" --ignore=ui_gui -q

# 运行 vx API 与服务层测试（使用 mongomock，无需真实 MongoDB）
python -m pytest tests/test_vx_api.py tests/test_internal_services.py -v

# 仅运行 vx API 测试
python -m pytest tests/test_vx_api.py -v

# 运行数据生成测试
python -m pytest tests/test_step1_data_generation.py -v
```

---

## 技术栈总览

| 层级 | 技术 |
|------|------|
| 消息队列 | RabbitMQ 3（AMQP 0.9.1） |
| NoSQL 数据库 | MongoDB 7 |
| SQL 数据库 | MySQL 8 |
| 后端 API | Flask + Gunicorn |
| 设备模拟引擎 | Python 3.12（NumPy + 自研 OOP 引擎） |
| 终端监控 | Textual（TUI 框架） |
| 桌面监控 | PyQt6 |
| 微信小程序 | 原生开发（WXML/WXSS/JS） |
| 管理后台前端 | 原生 HTML5 + CSS3 + JavaScript |
| 反向代理 | Nginx（SSL/TLS via Let's Encrypt） |
| 认证方案 | JWT + API Key + HMAC-SHA256 |
| 容器化 | Docker + Docker Compose |
| 测试框架 | pytest + mongomock |
| CI/CD | Jenkins |

---

> 如有问题，欢迎提 Issue 或联系项目维护者。
