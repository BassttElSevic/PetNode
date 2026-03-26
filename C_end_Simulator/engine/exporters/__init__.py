# engine/exporters 包 —— 数据输出层（策略模式）
# BaseExporter 定义了统一的导出接口（export / flush / close）；
# FileExporter 将 record 以 JSONL 格式追加写入本地文件；
# HttpExporter 通过 HTTP POST 将数据上报至 Flask 服务器。            ← 改了注释

from .base_exporter import BaseExporter
from .file_exporter import FileExporter
from .http_exporter import HttpExporter                              # ← 🆕 新增这一行

__all__ = ["BaseExporter", "FileExporter", "HttpExporter"]           # ← 🆕 加上 HttpExporter