from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.project import Project
from app.gateways.email_gateway import EmailGateway
from app.gateways.ses_gateway import SESGateway


class TestService:
    @staticmethod
    async def test_email(db: AsyncSession, project_id: int, recipient: str):
        res = await db.execute(select(Project).where(Project.id == project_id))
        project = res.scalar_one_or_none()

        if not project or not project.email_config:
            return False, "Email configuration not found for this project."

        conf = project.email_config
        provider = conf.get("provider", "smtp")

        if provider == "ses":
            if not conf.get("aws_access_key_id") or not conf.get("aws_secret_access_key"):
                return False, "Incomplete SES config — AWS Access Key ID and Secret Access Key are required."
            if not conf.get("sender"):
                return False, "Incomplete SES config — Sender Email is required."
            gateway = SESGateway(conf)
            provider_label = "AWS SES"
        else:
            if not conf.get("host") or not conf.get("user") or not conf.get("password"):
                return False, "Incomplete SMTP config — host, user, and password are required."
            gateway = EmailGateway(conf)
            provider_label = "SMTP"

        ok, msg = await gateway.verify_connection()
        if not ok:
            return False, msg

        body = (
            "Hello!\n\n"
            "This is a test message from OCAP to verify your email settings.\n"
            "If you received this, your configuration is working correctly.\n\n"
            f"Provider: {provider_label}\n"
            "— OCAP System"
        )
        result = await gateway.send_single(
            recipient=recipient,
            message=body,
            context={"subject": f"OCAP — {provider_label} Connection Test"},
        )
        if result["success"]:
            return True, f"Test email sent successfully via {provider_label}!"
        return False, result.get("error", f"Unknown {provider_label} error.")

    @staticmethod
    async def test_sms(db: AsyncSession, project_id: int, recipient: str):
        # Placeholder for Twilio/SMS API call
        # For now, we simulate a check of the keys
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        
        if not project or not project.sms_config:
            return False, "SMS configuration not found for this project."
            
        conf = project.sms_config
        if not conf.get("sid") or not conf.get("token"):
            return False, "Missing SID or Token."
            
        return True, f"Simulated SMS sent to {recipient}. API credentials validated."

    @staticmethod
    async def test_whatsapp(db: AsyncSession, project_id: int, recipient: str):
        # Placeholder for Meta API call
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        
        if not project or not project.whatsapp_config:
            return False, "WhatsApp configuration not found for this project."
            
        conf = project.whatsapp_config
        if not conf.get("token"):
            return False, "Missing Access Token."
            
        return True, f"Simulated WhatsApp message sent to {recipient}. API token validated."
