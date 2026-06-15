import logging
import os
from logging.handlers import RotatingFileHandler


def setup_logging(app):
    """
    Configure application-wide logging.
    - Console handler always active
    - File handler active in production
    - Rotating logs — max 10MB per file, keep 5 backups
    """

    log_level = logging.DEBUG if app.config.get("DEBUG") else logging.INFO
    formatter  = logging.Formatter(
        "[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # ── Console handler ────────────────────────────────────────────────────
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    # ── File handler (production only) ─────────────────────────────────────
    handlers = [console_handler]

    if not app.config.get("DEBUG"):
        os.makedirs("logs", exist_ok=True)
        file_handler = RotatingFileHandler(
            "logs/rm2_vms.log",
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        handlers.append(file_handler)

    # ── Apply to app and root logger ───────────────────────────────────────
    app.logger.setLevel(log_level)
    for handler in handlers:
        app.logger.addHandler(handler)

    # Silence noisy third-party loggers
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    app.logger.info(f"Logging initialised — level: {logging.getLevelName(log_level)}")
