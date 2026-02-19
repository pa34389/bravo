"""
Structured logging for Bravo scrapers.
Outputs to console and rotating log file. Adds GitHub Actions annotations when running in CI.
"""

import logging
import os
import sys
from datetime import date
from logging.handlers import RotatingFileHandler
from pathlib import Path

_loggers = {}
_initialized = False

IS_GHA = os.environ.get("GITHUB_ACTIONS") == "true"

LOG_DIR = Path(__file__).parent / "logs"


def _init_once():
    global _initialized
    if _initialized:
        return
    _initialized = True
    LOG_DIR.mkdir(exist_ok=True)


def get_logger(name: str) -> logging.Logger:
    """Get or create a named logger with console + file handlers."""
    if name in _loggers:
        return _loggers[name]

    _init_once()

    logger = logging.getLogger(f"bravo.{name}")
    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    if not logger.handlers:
        fmt = logging.Formatter(
            "%(asctime)s [%(name)s] %(levelname)s: %(message)s",
            datefmt="%H:%M:%S",
        )

        console = logging.StreamHandler(sys.stdout)
        console.setLevel(logging.INFO)
        console.setFormatter(fmt)
        logger.addHandler(console)

        log_file = LOG_DIR / f"scrape_{date.today().isoformat()}.log"
        file_handler = RotatingFileHandler(
            log_file, maxBytes=5 * 1024 * 1024, backupCount=3
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(fmt)
        logger.addHandler(file_handler)

    _loggers[name] = logger
    return logger


def gha_warning(msg: str):
    """Emit a GitHub Actions warning annotation."""
    if IS_GHA:
        print(f"::warning::{msg}")


def gha_error(msg: str):
    """Emit a GitHub Actions error annotation."""
    if IS_GHA:
        print(f"::error::{msg}")
