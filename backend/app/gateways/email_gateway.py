import asyncio
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List

import aiosmtplib

from app.core.config import settings
from app.gateways.base import BaseGateway

logger = logging.getLogger(__name__)


class EmailGateway(BaseGateway):
    """
    Async SMTP gateway for single and bulk email delivery.

    Project-level config (project.email_config) takes precedence over
    global settings. Expected config keys:
        host, port, user, password, sender, sender_name
    """

    def __init__(self, config: Dict[str, Any] = None):
        cfg = config or {}
        self.host = cfg.get("host") or settings.MAIL_HOST
        self.port = int(cfg.get("port") or settings.MAIL_PORT)
        self.username = cfg.get("user") or settings.MAIL_USERNAME
        self.password = cfg.get("password") or settings.MAIL_PASSWORD
        self.from_address = cfg.get("sender") or settings.MAIL_FROM_ADDRESS
        self.from_name = cfg.get("sender_name") or settings.MAIL_FROM_NAME
        self.max_retries = settings.MAIL_MAX_RETRIES
        self.retry_backoff = settings.MAIL_RETRY_BACKOFF
        self.rate_limit_delay = settings.MAIL_RATE_LIMIT_DELAY
        self.timeout = settings.MAIL_CONNECTION_TIMEOUT

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_message(
        self, to: str, subject: str, body: str, html_body: str = None
    ) -> MIMEMultipart:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f'"{self.from_name}" <{self.from_address}>'
        msg["To"] = to
        msg["X-Mailer"] = "OCAP Bulk Mailer"
        msg.attach(MIMEText(body, "plain", "utf-8"))
        if html_body:
            msg.attach(MIMEText(html_body, "html", "utf-8"))
        return msg

    async def _smtp_send(self, msg: MIMEMultipart) -> None:
        """Open a fresh SMTP connection, send one message, close."""
        await aiosmtplib.send(
            msg,
            hostname=self.host,
            port=self.port,
            username=self.username,
            password=self.password,
            start_tls=True,
            timeout=self.timeout,
        )

    # ------------------------------------------------------------------
    # BaseGateway interface
    # ------------------------------------------------------------------

    async def send_single(
        self, recipient: str, message: str, context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Send one email with retry + exponential back-off."""
        ctx = context or {}
        subject = ctx.get("subject") or "Message from OCAP"
        html_body = ctx.get("html_body")
        msg = self._build_message(recipient, subject, message, html_body)

        last_error = ""
        for attempt in range(1, self.max_retries + 1):
            try:
                await self._smtp_send(msg)
                logger.info("Email delivered to %s (attempt %d)", recipient, attempt)
                return {"success": True, "recipient": recipient}
            except Exception as exc:
                last_error = str(exc)
                wait = self.retry_backoff ** (attempt - 1)
                logger.warning(
                    "Email to %s failed (attempt %d/%d): %s — retrying in %.1fs",
                    recipient, attempt, self.max_retries, last_error, wait,
                )
                if attempt < self.max_retries:
                    await asyncio.sleep(wait)

        logger.error("Email to %s failed after %d attempts: %s", recipient, self.max_retries, last_error)
        return {"success": False, "recipient": recipient, "error": last_error}

    async def send_batch(self, batch: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Send emails sequentially with rate-limiting delay.
        Each item: {"recipient": str, "message": str, "context": dict}
        """
        results = []
        for item in batch:
            result = await self.send_single(
                recipient=item["recipient"],
                message=item["message"],
                context=item.get("context", {}),
            )
            results.append(result)
            await asyncio.sleep(self.rate_limit_delay)
        return results

    async def get_status(self, message_id: str) -> str:
        # SMTP is fire-and-forget — no native delivery tracking.
        return "sent"

    # ------------------------------------------------------------------
    # Convenience: validate credentials without sending
    # ------------------------------------------------------------------

    async def verify_connection(self) -> tuple[bool, str]:
        """Return (ok, message). Connects and authenticates but sends nothing."""
        try:
            smtp = aiosmtplib.SMTP(
                hostname=self.host,
                port=self.port,
                timeout=self.timeout,
            )
            await smtp.connect()
            await smtp.starttls()
            await smtp.login(self.username, self.password)
            await smtp.quit()
            return True, "SMTP connection successful."
        except Exception as exc:
            return False, f"SMTP Error: {exc}"
