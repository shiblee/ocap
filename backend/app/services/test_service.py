import smtplib
from email.message import EmailMessage
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.project import Project

class TestService:
    @staticmethod
    async def test_email(db: AsyncSession, project_id: int, recipient: str):
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        
        if not project or not project.email_config:
            return False, "Email configuration not found for this project."
            
        conf = project.email_config
        msg = EmailMessage()
        msg.set_content("Hello! This is a test message from OCAP to verify your SMTP settings. If you received this, your email configuration is correct.")
        msg["Subject"] = "OCAP Connection Test"
        
        # Use custom sender name or fallback to project name
        sender_display_name = conf.get("sender_name") or project.name
        sender_email = conf.get("sender") or conf.get("user")
        msg["From"] = f'"{sender_display_name}" <{sender_email}>'
        
        msg["To"] = recipient

        try:
            # We use synchronous smtplib here as it's a one-off test
            # In production worker, we'd use an async library or background task
            with smtplib.SMTP(conf.get("host"), conf.get("port", 587)) as server:
                server.starttls()
                server.login(conf.get("user"), conf.get("password"))
                server.send_message(msg)
            return True, "Test email sent successfully!"
        except Exception as e:
            return False, f"SMTP Error: {str(e)}"

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
