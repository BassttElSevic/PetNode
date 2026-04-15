"""engine.exporters —— 数据输出层（策略模式）

说明：
- BaseExporter 定义统一导出接口（export / flush / close）。
- FileExporter：本地写 JSONL（给 TUI/GUI 实时读取，非永久存储）。
- HttpExporter：HTTP POST 到 Flask（带 API Key + HMAC，可离线缓存并补发）。
- MqExporter：发布到 RabbitMQ（带 API Key + HMAC，可离线缓存并补发；由 mq-worker 消费并入库）。

调度器（engine/main.py）只依赖 BaseExporter 接口，因此可以通过参数/环境变量
在 http 与 mq 两种“主通道”之间切换，而无需改业务逻辑。
"""

from .base_exporter import BaseExporter
from .file_exporter import FileExporter
from .http_exporter import HttpExporter
from .mq_exporter import MqExporter

__all__ = ["BaseExporter", "FileExporter", "HttpExporter", "MqExporter"]