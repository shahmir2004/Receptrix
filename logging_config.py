"""
Structured logging configuration for Receptrix.

All modules import `get_logger(__name__)` instead of using print().
Log level is controlled by the LOG_LEVEL environment variable (default: INFO).
Format: JSON when LOG_FORMAT=json (production), plain text otherwise (dev).
"""
import logging
import os
import sys


def configure_logging() -> None:
    """Set up root logger. Call once at application startup (main.py)."""
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    log_format = os.getenv("LOG_FORMAT", "text").lower()

    if log_format == "json":
        try:
            import json_log_formatter  # optional dependency
            formatter = json_log_formatter.JSONFormatter()
        except ImportError:
            formatter = _text_formatter()
    else:
        formatter = _text_formatter()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    # Replace any default handlers
    root.handlers.clear()
    root.addHandler(handler)

    # Quiet noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def _text_formatter() -> logging.Formatter:
    return logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Use: logger = get_logger(__name__)"""
    return logging.getLogger(name)
