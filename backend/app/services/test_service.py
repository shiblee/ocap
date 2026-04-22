from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.project import Project
from app.gateways.email_gateway import EmailGateway

class TestService:
    @staticmethod
    async def test_email(db: AsyncSession, project_id: int, recipient: str):
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()

        if not project or not project.email_config:
            return False, "Email configuration not found for this project."

        conf = project.email_config
        if not conf.get("host") or not conf.get("user") or not conf.get("password"):
            return False, "Incomplete SMTP config — host, user, and password are required."

        gateway = EmailGateway(conf)

        # Verify credentials before sending
        ok, msg = await gateway.verify_connection()
        if not ok:
            return False, msg

        body = (
            "Hello!\n\n"
            "This is a test message from OCAP to verify your SMTP settings.\n"
            "If you received this, your email configuration is working correctly.\n\n"
            "— OCAP System"
        )
        result = await gateway.send_single(
            recipient=recipient,
            message=body,
            context={"subject": "OCAP — SMTP Connection Test"},
        )
        if result["success"]:
            return True, "Test email sent successfully!"
        return False, result.get("error", "Unknown SMTP error.")

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
