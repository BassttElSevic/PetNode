# C端狗项圈数据生成器

---

这是我们小组的狗项圈数据生成器，主要会生成一些数据，来模拟狗项圈检测到的

我们考虑的**架构** 是:
```
C_end_Simulator/                 <-- 第一阶段大目录 (在总项目的 Git 管理下)
│
├── .gitignore                   <-- 忽略 venv、__pycache__、.idea 等
├── docker-compose.yml           <-- 新增：编排容器
│
├── output_data/
│   │
│   ├── realtime_stream.jsonl    <-- 【给 UI 看的】实时热数据（UI不断读取它来画折线图）
│   ├── engine_status.json       <-- 【状态机】记录 Docker 引擎的死活、当前网络状态
│   │
│   ├── offline_cache/           <-- 【断网急救包】积压的未发送数据
│   │   ├── .gitkeep
│   │   └── pending_1700001.json <-- 网络断开时，堆积在这里的数据块
│   │
│   └── audit_logs/              <-- 【黑匣子】历史对账审计日志
│       ├── .gitkeep
│       ├── log_20231024.log     <-- 按天滚动的历史文件
│       └── log_20231025.log
│
├── engine/                     <-- 【核心一：打工人 (放进 Docker)】
│   ├── Dockerfile              <-- 镜像打包说明书
│   ├── requirements.txt        <-- 依赖清单 (faker 等)
│   ├── main.py                 <-- 核心调度器 (解析参数、管理多线程与队列)
│   │
│   ├── models/                 <-- [业务模型层]
│   │   └── smart_collar.py     <-- 智能项圈类 (OOP 封装，产生模拟数据)
│   │
│   ├── exporters/              <-- [数据输出层：策略模式]
│   │   ├── base_exporter.py    <-- 定义通用发送接口
│   │   ├── file_exporter.py    <-- 本周任务：写入 output_data/ 的 JSONL 文件
│   │   └── http_exporter.py    <-- 未来任务：发送给服务器 API (占位)
│   │
│   └── listeners/              <-- [指令接收层：监听服务器]
│       ├── base_listener.py    <-- 定义通用监听接口
│       ├── dummy_listener.py   <-- 本周任务：假装在监听 (控制台打印空转)
│       └── ws_listener.py      <-- 未来任务：WebSocket 接收控制指令 (占位)
│
├── ui_gui/                     <-- 【核心二：桌面图形界面 (外部 PyQt 运行)】
│   ├── requirements.txt        <-- 依赖清单 (PyQt6)
│   ├── app.py                  <-- UI 启动总入口 (统筹登录窗和主界面的切换)
│   ├── login_window.py         <-- 登录窗口类 (处理账号密码，生成 user_id)
│   └── main_window.py          <-- 主控制台窗口类 (发号施令、定时读取日志刷新图表)
│
└── ui_tui/                     <-- 【核心三：终端字符界面 (外部 Textual 运行)】
    ├── Dockerfile              <-- 🆕 新增 TUI 专属 Dockerfile
    ├── requirements.txt        <-- 依赖清单 (textual)
    ├── app.py                  <-- TUI 启动总入口
    └── screens/                
        ├── login_screen.py     <-- 极客风终端登录屏
        └── dashboard_screen.py <-- 极客风实时数据监控大屏
    
```
数据流解析
```mermaid
flowchart TD
    subgraph RemoteServer["☁️ 远程服务器 (S端)"]
        api["REST API<br/>接收数据上报"]
        ws_server["WebSocket Server<br/>下发控制指令"]
    end

    subgraph DockerEnv["🐳 Docker 环境"]

        subgraph EngineContainer["engine/ 容器 (后台常驻)"]
            main["engine/main.py<br/>核心调度器<br/>解析参数·管理多线程与队列"]
            collar["engine/models/smart_collar.py<br/>智能项圈类<br/>OOP封装·产生模拟数据"]

            subgraph Exporters["engine/exporters/ 数据输出层·策略模式"]
                base_exp["base_exporter.py<br/>通用发送接口"]
                file_exp["file_exporter.py<br/>写入 output_data/ JSONL"]
                http_exp["http_exporter.py<br/>发送给服务器 API<br/>(未来任务·占位)"]
                base_exp -.->|"继承"| file_exp
                base_exp -.->|"继承"| http_exp
            end

            subgraph Listeners["engine/listeners/ 指令接收层·监听服务器"]
                base_lis["base_listener.py<br/>通用监听接口"]
                dummy_lis["dummy_listener.py<br/>假装在监听<br/>控制台打印空转"]
                ws_lis["ws_listener.py<br/>WebSocket 接收控制指令<br/>(未来任务·占位)"]
                base_lis -.->|"继承"| dummy_lis
                base_lis -.->|"继承"| ws_lis
            end

            collar -->|"生成模拟数据"| main
            main -->|"调度输出"| file_exp
            main -->|"调度输出"| http_exp
            main -->|"注册监听"| dummy_lis
            main -->|"注册监听"| ws_lis
        end

        subgraph SharedVolume["📦 output_data/ (Docker Named Volume · /data/)"]
            stream["realtime_stream.jsonl<br/>实时热数据<br/>UI读取画折线图"]
            status["engine_status.json<br/>状态机<br/>Docker引擎死活·网络状态"]
            cache["offline_cache/<br/>断网急救包<br/>pending_1700001.json 等"]
            audit["audit_logs/<br/>黑匣子·历史对账审计<br/>log_20231024.log 等按天滚动"]
        end

        subgraph TUIContainer["ui_tui/ 容器 (交互式)"]
            tui_app["ui_tui/app.py<br/>TUI 启动总入口"]
            login_scr["ui_tui/screens/login_screen.py<br/>极客风终端登录屏"]
            dash_scr["ui_tui/screens/dashboard_screen.py<br/>极客风实时数据监控大屏"]
            tui_app --> login_scr
            login_scr -->|"登录成功"| dash_scr
        end

        %% Engine 写入本地文件
        file_exp -->|"✍️ 写入"| stream
        file_exp -->|"✍️ 写入"| status
        file_exp -->|"✍️ 写入(断网时)"| cache
        file_exp -->|"✍️ 写入"| audit

        %% TUI 读取本��文件
        stream -->|"👀 读取"| dash_scr
        status -->|"👀 读取"| dash_scr
        cache -->|"👀 读取"| dash_scr
        audit -->|"👀 读取"| dash_scr
    end

    %% Engine ↔ 远程服务器
    http_exp ==>|"📤 上报数据<br/>POST /api/data"| api
    cache -.->|"📤 网络恢复后<br/>补发积压数据"| http_exp
    ws_server ==>|"📩 下发控制指令<br/>WS 长连接"| ws_lis
    ws_lis -->|"指令传递给调度器"| main

    subgraph Host["🖥️ 宿主机"]
        terminal["用户终端<br/>stdin / stdout"]

        subgraph GUIApp["ui_gui/ (PyQt6 原生运行·不进Docker)"]
            gui_app["ui_gui/app.py<br/>UI启动总入口<br/>统筹登录窗和主界面切换"]
            gui_login["ui_gui/login_window.py<br/>登录窗口类<br/>处理账号密码·生成user_id"]
            gui_main["ui_gui/main_window.py<br/>主控制台窗口类<br/>发号施令·定时读取日志刷新图表"]
            gui_app --> gui_login
            gui_login -->|"登录成功"| gui_main
        end
    end

    terminal <-->|"TTY 交互<br/>docker compose run tui"| tui_app
    SharedVolume -.->|"bind mount<br/>或 volume 映射"| gui_main

    style RemoteServer fill:#8B0000,stroke:#FF4444,color:#e0e0e0
    style DockerEnv fill:#1a1a2e,stroke:#16213e,color:#e0e0e0
    style EngineContainer fill:#0f3460,stroke:#533483,color:#e0e0e0
    style Exporters fill:#1a4a1a,stroke:#2d7a2d,color:#e0e0e0
    style Listeners fill:#4a3a1a,stroke:#7a6a2d,color:#e0e0e0
    style SharedVolume fill:#2d4a22,stroke:#3a5a2c,color:#e0e0e0
    style TUIContainer fill:#4a1942,stroke:#6a2c70,color:#e0e0e0
    style Host fill:#2c2c2c,stroke:#555,color:#e0e0e0
    style GUIApp fill:#1b3a4b,stroke:#2d6187,color:#e0e0e0
```

