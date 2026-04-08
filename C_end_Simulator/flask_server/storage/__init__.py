"""flask_server.storage —— 存储层实现集合

说明：
- BaseStorage 是统一接口（策略模式）。
- FileStorage / MongoStorage 是具体实现。

app.py 只需选择并注入其中一个 Storage，实现“无痛替换存储后端”。
"""

from .base_storage import BaseStorage
from .file_storage import FileStorage
from .mongo_storage import MongoStorage

__all__ = [
	"BaseStorage",
	"FileStorage",
	"MongoStorage",
]

