# C端狗项圈数据生成器

---

这是我们小组的狗项圈数据生成器，主要会生成一些数据，来模拟狗项圈检测到的

我们考虑的**架构** 是:
```
C_end_Simulator/
│
├── engine/                 <-- 【核心：放进 Docker 的打工人】
│   ├── models/
│   │   └── smart_collar.py <-- 智能项圈类（产生数据）
│   ├── exporters/
│   │   └── file_exporter.py<-- 文件导出类（负责存盘）
│   ├── main.py             <-- 引擎入口（接收命令行参数）
│   ├── requirements.txt    <-- 依赖 (faker)
│   └── Dockerfile          <-- 打包脚本
│
├── ui_gui/                 <-- 【外部：桌面图形界面 PyQt】
│   ├── main_window.py      <-- 界面类
│   └── requirements.txt    <-- 依赖 (PyQt6)
│
├── ui_tui/                 <-- 【外部：终端字符界面 Textual】
│   ├── terminal_app.py     <-- 终端界面类
│   └── requirements.txt    <-- 依赖 (textual)
│
└── output_data/            <-- 【桥梁：数据中转站】
    └── .gitkeep            <-- 占位符，保证文件夹能被 Git 提交
```


