import logging
import json
import sys
from datetime import datetime
from typing import Any, Dict

# ═════════════════════════════════════════════════════════════════════════════
# Structured JSON Logger — Phase 8
# Production-grade logging with structured fields for Datadog/ELK/CloudWatch
# ═════════════════════════════════════════════════════════════════════════════

class StructuredFormatter(logging.Formatter):
    """Format logs as JSON for structured log aggregation"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields from record
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "action"):
            log_data["action"] = record.action
        if hasattr(record, "dataset_version"):
            log_data["dataset_version"] = record.dataset_version
            
        return json.dumps(log_data)


def setup_logging(log_level: str = "INFO", json_format: bool = True):
    """Configure application logging"""
    level = getattr(logging, log_level.upper(), logging.INFO)
    
    handler = logging.StreamHandler(sys.stdout)
    
    if json_format:
        handler.setFormatter(StructuredFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            '%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s'
        ))
    
    # Root logger
    logging.root.setLevel(level)
    logging.root.handlers = [handler]
    
    # Suppress noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    return logging.getLogger(__name__)


# Usage in main.py:
# from logging_config import setup_logging
# logger = setup_logging(os.getenv("LOG_LEVEL", "INFO"), json_format=os.getenv("LOG_FORMAT") == "json")
# logger.info("Application started", extra={"user_id": user.id, "action": "startup"})
