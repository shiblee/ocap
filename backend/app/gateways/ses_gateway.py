import asyncio
import logging
from typing import Any, Dict, List

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings
from app.gateways.base import BaseGateway

logger = logging.getLogger(__name__)

# SES error codes that should NOT be retried
_PERMANENT_ERRORS = {
    "MessageRejected",
    "InvalidParameterValue",
    "MailFromDomainNotVerified",
    "EmailAddressNotVerified",
    "AccountSendingPaused",
}


class SESGateway(BaseGateway):
    """
    AWS SES gateway using boto3 (sync) wrapped in asyncio executor.

    Project-level config (project.email_config) takes precedence over
    global settings. Expected config keys:
        aws_region, aws_access_key_id, aws_secret_access_key,
        sender, sender_name
    """

    def __init__(self, config: Dict[str, Any] = None):
        cfg = config or {}
        self.region = cfg.get("aws_region") or settings.AWS_REGION
        self.access_key = cfg.get("aws_access_key_id") or settings.AWS_ACCESS_KEY_ID
        self.secret_key = cfg.get("aws_secret_access_key") or settings.AWS_SECRET_ACCESS_KEY
        self.from_address = cfg.get("sender") or settings.MAIL_FROM_ADDRESS
        self.from_name = cfg.get("sender_name") or settings.MAIL_FROM_NAME
        self.max_retries = settings.MAIL_MAX_RETRIES
        self.retry_backoff = settings.MAIL_RETRY_BACKOFF
        self.rate_limit_delay = settings.MAIL_RATE_LIMIT_DELAY

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _client(self):
        return boto3.client(
            "ses",
            region_name=self.region,
            aws_access_key_id=self.access_key or None,
            aws_secret_access_key=self.secret_key or None,
        )

    def _send_sync(self, recipient: str, subject: str, body: str, html_body: str = None) -> str:
        """Blocking SES send — called inside run_in_executor."""
        source = f'"{self.from_name}" <{self.from_address}>'
        body_content = {"Text": {"Data": body, "Charset": "UTF-8"}}
        if html_body:
            body_content["Html"] = {"Data": html_body, "Charset": "UTF-8"}

        response = self._client().send_email(
            Source=source,
            Destination={"ToAddresses": [recipient]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": body_content,
            },
        )
        return response["MessageId"]

    def _verify_identity_sync(self) -> tuple:
        """Check that the sender email/domain is verified in SES."""
        client = self._client()
        domain = self.from_address.split("@")[-1]

        for identity in (self.from_address, domain):
            resp = client.get_identity_verification_attributes(Identities=[identity])
            status = (
                resp.get("VerificationAttributes", {})
                .get(identity, {})
                .get("VerificationStatus", "NotStarted")
            )
            if status == "Success":
                return True, f"AWS SES credentials valid. Sender identity '{identity}' verified."

        return (
            False,
            f"Sender '{self.from_address}' is not verified in SES. "
            "Please verify your email or domain in the AWS SES console.",
        )

    # ------------------------------------------------------------------
    # BaseGateway interface
    # ------------------------------------------------------------------

    async def send_single(
        self, recipient: str, message: str, context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Send one email via SES with retry + exponential back-off."""
        ctx = context or {}
        subject = ctx.get("subject") or "Message from OCAP"
        html_body = ctx.get("html_body")
        loop = asyncio.get_event_loop()
        last_error = ""

        for attempt in range(1, self.max_retries + 1):
            try:
                message_id = await loop.run_in_executor(
                    None,
                    lambda: self._send_sync(recipient, subject, message, html_body),
                )
                logger.info("SES delivered to %s — MessageId: %s (attempt %d)", recipient, message_id, attempt)
                return {"success": True, "recipient": recipient, "message_id": message_id}

            except ClientError as exc:
                code = exc.response["Error"]["Code"]
                last_error = f"{code}: {exc.response['Error']['Message']}"
                if code in _PERMANENT_ERRORS:
                    logger.error("SES permanent error for %s: %s", recipient, last_error)
                    break
                logger.warning("SES attempt %d/%d for %s: %s", attempt, self.max_retries, recipient, last_error)

            except Exception as exc:
                last_error = str(exc)
                logger.warning("SES attempt %d/%d for %s: %s", attempt, self.max_retries, recipient, last_error)

            if attempt < self.max_retries:
                await asyncio.sleep(self.retry_backoff ** (attempt - 1))

        logger.error("SES failed for %s after %d attempts: %s", recipient, self.max_retries, last_error)
        return {"success": False, "recipient": recipient, "error": last_error}

    async def send_batch(self, batch: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Rate-limited sequential batch send."""
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
        return "sent"

    # ------------------------------------------------------------------
    # Credential / identity check
    # ------------------------------------------------------------------

    async def verify_connection(self) -> tuple[bool, str]:
        """Verify AWS credentials and sender identity without sending."""
        loop = asyncio.get_event_loop()
        try:
            ok, msg = await loop.run_in_executor(None, self._verify_identity_sync)
            return ok, msg
        except ClientError as exc:
            code = exc.response["Error"]["Code"]
            return False, f"AWS SES Error — {code}: {exc.response['Error']['Message']}"
        except Exception as exc:
            return False, f"AWS SES connection failed: {exc}"
